import {
  PrismaClient,
  StaffRole,
  BillingCycle,
  AttendanceSource,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  Gender,
  ContactMethod,
  IdProofType,
  ExperienceLevel,
  FitnessGoal,
  FreezeReason,
  LeadSource,
  LeadStatus,
  DietGoal,
  PtSessionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * The demo roster, named rather than generated: a handful of real-looking
 * members reads better in a walkthrough than a wall of synthetic rows, and the
 * spread below deliberately covers every access state the UI can show.
 */
type MemberState = 'ACTIVE' | 'EXPIRING' | 'OVERDUE' | 'FROZEN' | 'CANCELLED';

const MEMBER_SEEDS: {
  name: string;
  /** Index into the plan list: 0 Monthly, 1 Quarterly, 2 Annual, 3 Off-Peak. */
  plan: number;
  state: MemberState;
  /** Days since joining, which also decides how much history they have. */
  joined: number;
}[] = [
  { name: 'Nathish',  plan: 0, state: 'ACTIVE',    joined: 42 },
  { name: 'Sabaresh', plan: 1, state: 'ACTIVE',    joined: 128 },
  { name: 'Kishore',  plan: 0, state: 'EXPIRING',  joined: 64 },
  { name: 'Kumar',    plan: 0, state: 'OVERDUE',   joined: 96 },
  { name: 'Abdul',    plan: 2, state: 'ACTIVE',    joined: 210 },
  { name: 'Yogesh',   plan: 1, state: 'FROZEN',    joined: 155 },
  { name: 'Krithik',  plan: 3, state: 'ACTIVE',    joined: 4 },
  { name: 'Ram',      plan: 0, state: 'CANCELLED', joined: 185 },
  { name: 'Prasad',   plan: 1, state: 'ACTIVE',    joined: 72 },
];

/** Used only for emergency-contact names, so they read as relatives. */
const KIN_NAMES = ['Meena', 'Arun', 'Latha', 'Suresh', 'Divya', 'Karthik', 'Anitha', 'Vimal'];

const GENDERS = [Gender.MALE, Gender.FEMALE, Gender.FEMALE, Gender.MALE, Gender.PREFER_NOT_TO_SAY];
const CONTACT_METHODS = [
  ContactMethod.WHATSAPP,
  ContactMethod.PHONE,
  ContactMethod.EMAIL,
  ContactMethod.SMS,
];
const ID_PROOF_TYPES = [
  IdProofType.AADHAAR,
  IdProofType.AADHAAR,
  IdProofType.PASSPORT,
  IdProofType.DRIVING_LICENSE,
];
const LEVELS = [
  ExperienceLevel.BEGINNER,
  ExperienceLevel.INTERMEDIATE,
  ExperienceLevel.ADVANCED,
  ExperienceLevel.BEGINNER,
];
const GOALS = [
  FitnessGoal.WEIGHT_LOSS,
  FitnessGoal.MUSCLE_GAIN,
  FitnessGoal.GENERAL_FITNESS,
  FitnessGoal.STRENGTH,
  FitnessGoal.REHAB,
  FitnessGoal.ENDURANCE,
];
const OCCUPATIONS = [
  'Software engineer', 'Teacher', 'Doctor', 'Chartered accountant', 'Architect',
  'Sales manager', 'Student', 'Graphic designer', 'Civil engineer', 'Consultant',
];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Child'];
const PAYMENT_METHODS = [
  PaymentMethod.UPI,
  PaymentMethod.CARD,
  PaymentMethod.UPI,
  PaymentMethod.CASH,
  PaymentMethod.BANK_TRANSFER,
];
const CITIES = ['Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai'];
const STATES = ['Karnataka', 'Tamil Nadu', 'Telangana', 'Maharashtra', 'Maharashtra'];
const STREETS = ['MG Road', '5th Cross, Indiranagar', 'Anna Salai', 'Jubilee Hills', 'FC Road'];
const CONDITIONS = ['Hypertension (controlled)', 'Type 2 diabetes', 'Asthma', 'Hypothyroidism'];
const ALLERGIES = ['Peanuts', 'Dust', 'Penicillin', 'Lactose intolerant'];
const INJURIES = [
  'Left knee ACL repair, 2023 — avoid deep squats',
  'Lower back strain — no heavy deadlifts',
  'Right shoulder impingement',
  'Ankle sprain, healed',
];
const NOTES = [
  'Prefers morning slots. Asked about nutrition coaching.',
  'Travels often for work — flexible scheduling needed.',
  'Training for a half marathon in December.',
  'Mentioned considering an upgrade to Annual Elite.',
  'Card declined last cycle — followed up, now on UPI autopay.',
];
const SESSION_FOCUS = ['Lower body', 'Upper push', 'Upper pull', 'Core & mobility', 'Conditioning', 'Full body'];
const DIET_GOALS = [DietGoal.FAT_LOSS, DietGoal.MUSCLE_GAIN, DietGoal.MAINTENANCE, DietGoal.PERFORMANCE];
const DIET_TITLES = ['Lean & Strong 8-week', 'Muscle Builder', 'Balanced Maintenance', 'Endurance Fuel'];
const LEAD_NOTES = [
  'Asked about morning batches. Wants to start next week.',
  'Saw the Instagram reel. Interested in PT bundle.',
  'Comparing with another gym nearby — price sensitive.',
  'Referred by Pooja Reddy. Trial booked for Saturday.',
];
const MEALS = [
  { time: '7:30 AM', name: 'Breakfast', items: ['Oats with milk', '2 boiled eggs', 'Banana'], calories: 520 },
  { time: '10:30 AM', name: 'Snack', items: ['Greek yogurt', 'Almonds (10)'], calories: 220 },
  { time: '1:30 PM', name: 'Lunch', items: ['Brown rice', 'Grilled chicken 150g', 'Mixed veg sabzi', 'Salad'], calories: 680 },
  { time: '4:30 PM', name: 'Pre-workout', items: ['Whole-wheat toast + peanut butter', 'Black coffee'], calories: 280 },
  { time: '8:00 PM', name: 'Dinner', items: ['Paneer / fish 150g', '2 rotis', 'Dal', 'Cucumber salad'], calories: 600 },
];
const SESSION_NOTES = [
  'Focused on squat depth and bracing.',
  'Upper body push. Increased bench to 45kg.',
  'Mobility and core. Knee felt stable throughout.',
  'Deadlift technique — kept load light, form improving.',
  'Conditioning intervals. Good effort, recovery improving.',
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/**
 * One clock for the whole run. Calling `new Date()` per invocation made two dates
 * that should be exactly 30 days apart differ by a few milliseconds, so integer
 * day maths floored the span to 29 and members showed one day less than they had.
 */
const SEED_NOW = new Date();

function daysAgo(n: number): Date {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Stable IDs for the tenant and its staff. Re-seeding used to mint fresh cuids,
 * which silently orphaned every issued JWT: the token still verified, but its
 * tenantId matched nothing, so the apps rendered an empty club instead of the
 * demo data. Pinning these keeps a signed-in session working across re-seeds.
 */
const SHAPER_TENANT_ID = 'seed-tenant-shaper';
const OWNER_ID = 'seed-user-shaper-owner';
const MANAGER_ID = 'seed-user-shaper-manager';
const COACH_ID = 'seed-user-shaper-coach';

async function main() {
  await prisma.tenant.deleteMany({ where: { subdomain: { in: ['shaper', 'demo-gym', 'iron-house'] } } });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const tenant = await prisma.tenant.create({
    data: {
      id: SHAPER_TENANT_ID,
      name: 'SHAPER Elite Fitness Studio',
      subdomain: 'shaper',
      logoUrl: '/brand/mark.png',
      colors: { primary: '#f00000', secondary: '#0a0a0a' },
      users: {
        create: [
          {
            id: OWNER_ID,
            email: 'owner@shaper.fit',
            passwordHash,
            firstName: 'Nathish',
            lastName: '',
            role: StaffRole.OWNER,
          },
          {
            id: MANAGER_ID,
            email: 'prethive@shaper.fit',
            passwordHash,
            firstName: 'Prethive',
            lastName: '',
            role: StaffRole.TRAINER,
          },
          {
            id: COACH_ID,
            email: 'sagar@shaper.fit',
            passwordHash,
            firstName: 'Sagar',
            lastName: '',
            role: StaffRole.TRAINER,
          },
        ],
      },
      membershipPlans: {
        create: [
          {
            name: 'Monthly Unlimited',
            description: 'Full gym access, all group classes',
            priceCents: 199900,
            currency: 'INR',
            billingCycle: BillingCycle.MONTHLY,
          },
          {
            name: 'Quarterly Saver',
            description: '3 months, billed upfront',
            priceCents: 519900,
            currency: 'INR',
            billingCycle: BillingCycle.QUARTERLY,
          },
          {
            name: 'Annual Elite',
            description: 'Gym + classes + 4 PT sessions/month',
            priceCents: 1799900,
            currency: 'INR',
            billingCycle: BillingCycle.YEARLY,
          },
          {
            name: 'Off-Peak',
            description: 'Weekdays before 4pm',
            priceCents: 129900,
            currency: 'INR',
            billingCycle: BillingCycle.MONTHLY,
          },
        ],
      },
    },
    include: { membershipPlans: true, users: true },
  });

  // The owner doubles as the note author; the club has no separate admin.
  const manager = tenant.users.find((u) => u.role === StaffRole.OWNER)!;
  const [prethive, sagar] = tenant.users.filter((u) => u.role === StaffRole.TRAINER);
  const plans = tenant.membershipPlans;

  // Two branches — the network view needs somewhere for members and staff to belong.
  const [hqBranch, eastBranch] = await Promise.all([
    prisma.branch.create({
      data: {
        tenantId: tenant.id, name: 'Indiranagar', code: 'IND', city: 'Bengaluru',
        addressLine: '100 Feet Road, Indiranagar', phone: '+91-80-4111-2200', openingHours: '5:30am – 10:30pm',
      },
    }),
    prisma.branch.create({
      data: {
        tenantId: tenant.id, name: 'Whitefield', code: 'WHF', city: 'Bengaluru',
        addressLine: 'ITPL Main Road, Whitefield', phone: '+91-80-4111-2201', openingHours: '6:00am – 10:00pm',
      },
    }),
  ]);

  await prisma.user.update({
    where: { id: sagar.id },
    data: { specialty: 'Functional training, rehab', phone: '+91-98450-11224', branchId: hqBranch.id },
  });
  await prisma.user.update({
    where: { id: prethive.id },
    data: { specialty: 'Strength & conditioning', phone: '+91-98450-11223', branchId: eastBranch.id },
  });
  await prisma.user.update({ where: { id: manager.id }, data: { branchId: hqBranch.id, phone: '+91-98450-11225' } });
  const trainers = [sagar, prethive];
  const memberIds: string[] = [];
  const joinedDaysAgoById = new Map<string, number>();
  for (let i = 0; i < MEMBER_SEEDS.length; i++) {
    // PT members are every third member, so indexing their sessions off `i` steps by 3
    // and collapses every modulo cycle — one trainer, one focus, two time slots.
    // `k` steps by 1 across just the PT members, so the agenda actually varies.
    const k = i / 3;
    const seed = MEMBER_SEEDS[i];
    const { name: firstName, state } = seed;
    const lastName = '';
    const plan = plans[seed.plan];
    const joinedDaysAgo = seed.joined;

    // The current period has to be a real cycle of the plan's length, or "days left"
    // and the progress meter divide by the wrong denominator — a monthly member who
    // joined two days before expiry reads as a two-day membership. Deriving it from
    // the join date (rather than forcing the join date back) keeps recent sign-ups
    // recent.
    const cycleDays =
      plan.billingCycle === BillingCycle.YEARLY ? 365
      : plan.billingCycle === BillingCycle.QUARTERLY ? 90
      : 30;
    const periodsElapsed = Math.floor(joinedDaysAgo / cycleDays);

    const isOverdue = state === 'OVERDUE';
    const isCancelled = state === 'CANCELLED';

    const status = isOverdue
      ? SubscriptionStatus.PAST_DUE
      : isCancelled
        ? SubscriptionStatus.CANCELLED
        : SubscriptionStatus.ACTIVE;

    // The latest whole cycle since joining. For an overdue member it is the one
    // before that, so the period has already lapsed.
    const latestStartDaysAgo = joinedDaysAgo - periodsElapsed * cycleDays;
    // EXPIRING shifts the window so it ends in a few days, which is what drives
    // the "renewals to chase" list.
    const expiringShift = state === 'EXPIRING' ? cycleDays - latestStartDaysAgo - 4 : 0;
    const periodStartDaysAgo =
      (isOverdue ? latestStartDaysAgo + cycleDays : latestStartDaysAgo) + expiringShift;
    const periodEndDaysAgo = periodStartDaysAgo - cycleDays;
    const periodEnd = daysAgo(periodEndDaysAgo);

    const heightCm = 155 + ((i * 7) % 35);

    const member = await prisma.member.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}${i}@example.com`,
        phone: `+91-9${String(100000000 + i * 7654321).slice(0, 9)}`,
        alternatePhone: i % 4 === 0 ? `+91-8${String(200000000 + i * 1234567).slice(0, 9)}` : null,
        dateOfBirth: new Date(1978 + (i % 25), i % 12, 1 + (i % 27)),
        gender: pick(GENDERS, i),
        occupation: pick(OCCUPATIONS, i),
        preferredContact: pick(CONTACT_METHODS, i),
        addressLine: `${12 + i} ${pick(STREETS, i)}`,
        city: pick(CITIES, i),
        state: pick(STATES, i),
        postalCode: String(560000 + ((i * 37) % 900)),

        idProofType: pick(ID_PROOF_TYPES, i),
        idProofLast4: String(1000 + ((i * 7919) % 9000)),

        emergencyName: pick(KIN_NAMES, i),
        emergencyRelationship: pick(RELATIONSHIPS, i),
        emergencyPhone: `+91-7${String(300000000 + i * 2345678).slice(0, 9)}`,

        medicalConditions: i % 6 === 0 ? pick(CONDITIONS, i) : null,
        allergies: i % 5 === 0 ? pick(ALLERGIES, i) : null,
        medications: i % 7 === 0 ? 'Metformin 500mg, daily' : null,
        injuries: i % 4 === 0 ? pick(INJURIES, i) : null,
        physicianClearance: i % 6 === 0,
        physicianClearanceDate: i % 6 === 0 ? daysAgo(joinedDaysAgo - 2) : null,
        parqCompletedAt: i % 11 === 0 ? null : daysAgo(joinedDaysAgo),
        waiverSignedAt: i % 11 === 0 ? null : daysAgo(joinedDaysAgo),

        primaryGoal: pick(GOALS, i),
        experienceLevel: pick(LEVELS, i),
        heightCm,
        branchId: i % 3 === 2 ? eastBranch.id : hqBranch.id,
        assignedTrainerId: i % 3 === 0 ? pick(trainers, k).id : null,
        accessCardNumber: `RF-${String(10000 + i * 137)}`,

        createdAt: daysAgo(joinedDaysAgo),
        subscriptions: {
          create: {
            membershipPlanId: plan.id,
            status,
            startDate: daysAgo(periodStartDaysAgo),
            currentPeriodEnd: periodEnd,
            ...(isCancelled ? { cancelledAt: daysAgo(10) } : {}),
          },
        },
      },
      include: { subscriptions: true },
    });

    // Measurement history — a slow downward weight trend so progress charts have a shape.
    const startWeight = 62 + ((i * 11) % 38);
    for (let m = 3; m >= 0; m--) {
      if (m * 28 + 2 > joinedDaysAgo) continue;
      await prisma.bodyMeasurement.create({
        data: {
          memberId: member.id,
          recordedAt: daysAgo(m * 28 + 2),
          weightKg: Math.round((startWeight - (3 - m) * 0.8) * 10) / 10,
          bodyFatPercent: Math.round((26 - (3 - m) * 0.6 + (i % 5)) * 10) / 10,
          waistCm: 78 + (i % 18) - (3 - m),
          chestCm: 92 + (i % 14),
          armCm: 30 + (i % 8),
        },
      });
    }

    if (i % 5 === 0) {
      await prisma.memberNote.create({
        data: {
          memberId: member.id,
          authorId: manager.id,
          body: pick(NOTES, i),
          pinned: i % 10 === 0,
          createdAt: daysAgo(4 + (i % 20)),
        },
      });
    }

    // Personal-training packages for a third of the roster.
    if (i % 3 === 0) {
      const ptTrainer = pick(trainers, k);
      const purchased = 8 + (k % 3) * 4;
      const pkg = await prisma.ptPackage.create({
        data: {
          memberId: member.id,
          trainerId: ptTrainer.id,
          sessionsPurchased: purchased,
          priceCents: purchased * 80000,
          currency: 'INR',
          purchasedAt: daysAgo(Math.min(joinedDaysAgo, 50)),
          expiresAt: daysAgo(-60),
        },
      });

      const used = Math.min(purchased - 2, 3 + (k % 5));
      for (let s = 0; s < used; s++) {
        await prisma.ptSession.create({
          data: {
            packageId: pkg.id,
            memberId: member.id,
            trainerId: ptTrainer.id,
            scheduledAt: daysAgo(s * 6 + 3),
            status: PtSessionStatus.COMPLETED,
            completedAt: daysAgo(s * 6 + 3),
            focus: pick(SESSION_FOCUS, k + s),
            notes: pick(SESSION_NOTES, k + s),
          },
        });
      }

      // Two upcoming sessions so today's agenda and the member's "next session" are populated.
      // Slots spread across a real gym day rather than clustering on one hour.
      const SLOTS = [6, 7, 9, 11, 17, 18, 19, 20];
      for (let s = 0; s < 2; s++) {
        // Day offset cycles on 3 and the trainer on 2, so the two stay out of phase —
        // keying both on `% 2` would put a single trainer on every session today.
        const when = daysAgo(-(s * 3 + (k % 3)));
        when.setHours(pick(SLOTS, k * 3 + s), (k + s) % 2 === 0 ? 0 : 30, 0, 0);
        await prisma.ptSession.create({
          data: {
            packageId: pkg.id, memberId: member.id, trainerId: ptTrainer.id,
            scheduledAt: when, status: PtSessionStatus.SCHEDULED, focus: pick(SESSION_FOCUS, k + s + 2),
          },
        });
      }
    }

    // Diet plans for members with a trainer.
    if (i % 3 === 0) {
      const goal = pick(DIET_GOALS, k);
      await prisma.dietPlan.create({
        data: {
          memberId: member.id,
          trainerId: pick(trainers, k).id,
          title: pick(DIET_TITLES, k),
          goal,
          dailyCalories: goal === DietGoal.FAT_LOSS ? 1800 : goal === DietGoal.MUSCLE_GAIN ? 2600 : 2200,
          proteinG: goal === DietGoal.MUSCLE_GAIN ? 160 : 120,
          carbsG: goal === DietGoal.FAT_LOSS ? 150 : 250,
          fatG: 65,
          meals: MEALS,
          notes: 'Hydration target 3L/day. Adjust carbs on rest days.',
          startDate: daysAgo(Math.min(joinedDaysAgo, 21)),
        },
      });
    }

    // The member marked FROZEN is on a hold, which exercises that access path.
    if (state === 'FROZEN') {
      await prisma.subscriptionFreeze.create({
        data: {
          subscriptionId: member.subscriptions[0].id,
          startDate: daysAgo(6),
          endDate: daysAgo(-12),
          reason: FreezeReason.MEDICAL,
          note: 'Knee rehab — cleared to return next month',
        },
      });
    }

    memberIds.push(member.id);
    joinedDaysAgoById.set(member.id, joinedDaysAgo);

    // Payment history — one per month since joining, for the revenue chart.
    const subscription = member.subscriptions[0];
    const monthsActive = Math.min(6, Math.max(1, Math.floor(joinedDaysAgo / 30)));
    for (let m = 0; m < monthsActive; m++) {
      const paidAt = new Date();
      paidAt.setMonth(paidAt.getMonth() - m);
      paidAt.setDate(2 + (i % 20));
      // No one pays before they join.
      if (paidAt < daysAgo(joinedDaysAgo)) continue;

      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amountCents: plan.priceCents,
          currency: 'INR',
          status: PaymentStatus.SUCCEEDED,
          method: pick(PAYMENT_METHODS, i + m),
          provider: 'mock',
          dueAt: paidAt,
          paidAt,
          createdAt: paidAt,
        },
      });
    }

    // Overdue members carry a real unpaid invoice, so "outstanding balance" is
    // derived from payment rows rather than invented in the UI.
    if (isOverdue) {
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amountCents: plan.priceCents,
          currency: 'INR',
          status: i % 18 === 0 ? PaymentStatus.FAILED : PaymentStatus.PENDING,
          method: pick(PAYMENT_METHODS, i),
          provider: 'mock',
          dueAt: periodEnd,
          createdAt: periodEnd,
        },
      });
    }
  }

  // Attendance across the last 14 days — busier on weekdays, quieter on weekends.
  const sources = [
    AttendanceSource.QR,
    AttendanceSource.QR,
    AttendanceSource.RFID,
    AttendanceSource.BIOMETRIC,
    AttendanceSource.MANUAL,
  ];

  const attendanceRows: {
    tenantId: string;
    memberId: string;
    source: AttendanceSource;
    checkedInAt: Date;
  }[] = [];

  // Every 7th member stopped coming ~3 weeks ago, so churn risk has real HIGH cases
  // instead of every member looking healthy.
  const lapsedMemberIds = new Set(memberIds.filter((_, idx) => idx % 7 === 0));

  // 70 days of history: the risk model compares the last 30 days against the 30 before.
  for (let d = 69; d >= 0; d--) {
    const day = daysAgo(d);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    // Walk the roster and decide whether each member trained that day, rather
    // than drawing N visits from the list: drawing repeated the same member
    // several times a day once the roster was small, which showed up as one
    // person checking in six times and "43 visits in 30 days".
    memberIds.forEach((memberId, idx) => {
      if (d < 21 && lapsedMemberIds.has(memberId)) return;
      // Nobody checks in before they joined.
      if (d > (joinedDaysAgoById.get(memberId) ?? 0)) return;

      // Each member keeps their own cadence — every 2nd, 3rd or 4th day — so
      // the attendance chart has texture instead of a flat line.
      const everyNDays = 2 + (idx % 3);
      if ((d + idx) % everyNDays !== 0) return;
      // Weekends are quieter: only half the usual crowd turns up.
      if (isWeekend && (d + idx) % 2 !== 0) return;

      const checkedInAt = new Date(day);
      checkedInAt.setHours(6 + ((idx * 5 + d) % 14), (idx * 17) % 60, 0, 0);

      attendanceRows.push({
        tenantId: tenant.id,
        memberId,
        source: pick(sources, idx + d),
        checkedInAt,
      });
    });
  }

  await prisma.attendanceEvent.createMany({ data: attendanceRows });

  // Leads across the funnel — the front of the sales pipeline.
  const LEAD_ROWS: [string, string, LeadSource, LeadStatus, number][] = [
    ['Kiran', 'Bhat', LeadSource.WALK_IN, LeadStatus.NEW, 0],
    ['Sunita', 'Pillai', LeadSource.INSTAGRAM, LeadStatus.NEW, 1],
    ['Farhan', 'Ali', LeadSource.WEBSITE, LeadStatus.CONTACTED, 2],
    ['Deepa', 'Menon', LeadSource.REFERRAL, LeadStatus.CONTACTED, 0],
    ['Arun', 'Kumar', LeadSource.PHONE, LeadStatus.TRIAL, 3],
    ['Shreya', 'Ghosh', LeadSource.INSTAGRAM, LeadStatus.TRIAL, 1],
    ['Vivek', 'Nanda', LeadSource.WEBSITE, LeadStatus.CONVERTED, 2],
    ['Lata', 'Iyer', LeadSource.WALK_IN, LeadStatus.LOST, 0],
    ['Mohit', 'Saxena', LeadSource.REFERRAL, LeadStatus.NEW, 3],
  ];
  for (const [idx, [fn, ln, source, status, planIdx]] of LEAD_ROWS.entries()) {
    await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        branchId: idx % 2 === 0 ? hqBranch.id : eastBranch.id,
        firstName: fn, lastName: ln,
        phone: `+91-97${String(100000000 + idx * 3456789).slice(0, 8)}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        source, status,
        interestedPlanId: plans[planIdx].id,
        assignedTrainerId: pick(trainers, idx).id,
        notes: pick(LEAD_NOTES, idx),
        followUpAt: status === LeadStatus.CONVERTED || status === LeadStatus.LOST ? null : daysAgo(-(1 + (idx % 4))),
        createdAt: daysAgo(idx * 2 + 1),
      },
    });
  }

  // A few classes across the coming week for the schedule screen.
  const CLASS_NAMES = ['HIIT Blast', 'Yoga Flow', 'Strength Circuit', 'Spin 45', 'Mobility & Core', 'Boxing Basics'];
  for (let d = 0; d < 7; d++) {
    for (let slot = 0; slot < 3; slot++) {
      const startsAt = daysAgo(-d);
      startsAt.setHours(slot === 0 ? 6 : slot === 1 ? 12 : 18, 30, 0, 0);
      const endsAt = new Date(startsAt.getTime() + 60 * 60000);
      const cls = await prisma.gymClass.create({
        data: {
          tenantId: tenant.id,
          branchId: slot === 1 ? eastBranch.id : hqBranch.id,
          trainerId: pick(trainers, d + slot).id,
          name: pick(CLASS_NAMES, d + slot),
          startsAt, endsAt, capacity: 12 + (slot * 4),
        },
      });
      const bookers = memberIds.slice((d * 3 + slot) % 10, (d * 3 + slot) % 10 + 5 + slot * 2);
      for (const memberId of bookers) {
        await prisma.booking.create({ data: { gymClassId: cls.id, memberId, trainerId: cls.trainerId } });
      }
    }
  }

  // A second tenant proves the white-label story: different brand, isolated data.
  await prisma.tenant.create({
    data: {
      name: 'Iron House Strength Co.',
      subdomain: 'iron-house',
      colors: { primary: '#2a78d6', secondary: '#0b0b0b' },
      users: {
        create: {
          email: 'owner@iron-house.com',
          passwordHash,
          firstName: 'Sam',
          lastName: 'Okafor',
          role: StaffRole.OWNER,
        },
      },
      membershipPlans: {
        create: [
          {
            name: 'Strength Monthly',
            priceCents: 249900,
            currency: 'INR',
            billingCycle: BillingCycle.MONTHLY,
          },
        ],
      },
    },
  });

  console.log(`Seed complete.
  Tenant 1: subdomain "shaper"      · owner@shaper.fit     · Password123!  (SHAPER red, ${memberIds.length} members)
  Tenant 2: subdomain "iron-house"  · owner@iron-house.com · Password123!  (blue brand, empty — proves isolation)
  Staff: Nathish (owner) · Prethive & Sagar (trainers) — prethive@ / sagar@shaper.fit`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

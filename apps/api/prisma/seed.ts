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

const FIRST_NAMES = [
  'Aarav', 'Diya', 'Rohan', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Kavya',
  'Karan', 'Priya', 'Nikhil', 'Sneha', 'Rahul', 'Isha', 'Aditya', 'Neha',
  'Siddharth', 'Tara', 'Manish', 'Pooja', 'Varun', 'Riya', 'Sameer', 'Lakshmi',
  'Dev', 'Anjali', 'Yash', 'Nisha',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Kapoor', 'Desai',
  'Joshi', 'Rao', 'Gupta', 'Malhotra', 'Chopra', 'Verma',
];

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
            email: 'manager@shaper.fit',
            passwordHash,
            firstName: 'Priya',
            lastName: 'Sharma',
            role: StaffRole.ADMIN,
          },
          {
            id: COACH_ID,
            email: 'coach@shaper.fit',
            passwordHash,
            firstName: 'Dev',
            lastName: 'Kapoor',
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

  const manager = tenant.users.find((u) => u.role === StaffRole.ADMIN)!;
  const trainer = tenant.users.find((u) => u.role === StaffRole.TRAINER)!;
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

  // A second trainer so assignment and PT agendas have more than one name.
  const trainer2 = await prisma.user.create({
    data: {
      tenantId: tenant.id, email: 'anita@shaper.fit', passwordHash, firstName: 'Anita', lastName: 'Rao',
      role: StaffRole.TRAINER, specialty: 'Strength & conditioning', phone: '+91-98450-11223', branchId: eastBranch.id,
    },
  });
  await prisma.user.update({ where: { id: trainer.id }, data: { specialty: 'Functional training, rehab', phone: '+91-98450-11224', branchId: hqBranch.id } });
  await prisma.user.update({ where: { id: manager.id }, data: { branchId: hqBranch.id, phone: '+91-98450-11225' } });
  const trainers = [trainer, trainer2];
  // Weighted so the distribution chart has a clear shape rather than a flat tie.
  const planWeights = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3];

  const memberIds: string[] = [];
  const joinedDaysAgoById = new Map<string, number>();
  for (let i = 0; i < 28; i++) {
    // PT members are every third member, so indexing their sessions off `i` steps by 3
    // and collapses every modulo cycle — one trainer, one focus, two time slots.
    // `k` steps by 1 across just the PT members, so the agenda actually varies.
    const k = i / 3;
    const firstName = pick(FIRST_NAMES, i);
    const lastName = pick(LAST_NAMES, i * 3 + 1);
    const plan = plans[planWeights[i % planWeights.length]];

    // The first few members joined within the last week, so the "new sign-ups"
    // chart has something to plot; the rest spread back over about five months.
    const joinedDaysAgo = i < 6 ? 1 + i : 5 + ((i * 17) % 160);

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

    // Only someone who has already completed a cycle can be behind on payment.
    const isOverdue = i % 9 === 0 && periodsElapsed >= 1;
    const isCancelled = i % 13 === 0 && !isOverdue;

    const status = isOverdue
      ? SubscriptionStatus.PAST_DUE
      : isCancelled
        ? SubscriptionStatus.CANCELLED
        : SubscriptionStatus.ACTIVE;

    // The latest whole cycle since joining. For an overdue member it is the one
    // before that, so the period has already lapsed.
    const latestStartDaysAgo = joinedDaysAgo - periodsElapsed * cycleDays;
    const periodStartDaysAgo = isOverdue ? latestStartDaysAgo + cycleDays : latestStartDaysAgo;
    const periodEndDaysAgo = periodStartDaysAgo - cycleDays;
    const periodEnd = daysAgo(periodEndDaysAgo);

    const heightCm = 155 + ((i * 7) % 35);

    const member = await prisma.member.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
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

        emergencyName: `${pick(FIRST_NAMES, i + 9)} ${lastName}`,
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

    // A couple of members on a medical/travel hold, to exercise the freeze path.
    // Only members who have been around long enough for a hold to make sense.
    if (i % 14 === 0 && joinedDaysAgo > 20) {
      await prisma.subscriptionFreeze.create({
        data: {
          subscriptionId: member.subscriptions[0].id,
          startDate: daysAgo(6),
          endDate: daysAgo(-12),
          reason: i % 28 === 0 ? FreezeReason.MEDICAL : FreezeReason.TRAVEL,
          note: i % 28 === 0 ? 'Knee rehab — cleared to return next month' : 'Overseas for work',
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
    const visits = isWeekend ? 6 + (d % 4) : 12 + (d % 7);

    for (let v = 0; v < visits; v++) {
      const memberId = memberIds[(d * 7 + v * 3) % memberIds.length];
      if (d < 21 && lapsedMemberIds.has(memberId)) continue;
      // Nobody checks in before they joined.
      if (d > (joinedDaysAgoById.get(memberId) ?? 0)) continue;

      const checkedInAt = new Date(day);
      checkedInAt.setHours(6 + ((v * 3) % 15), (v * 13) % 60, 0, 0);

      attendanceRows.push({
        tenantId: tenant.id,
        memberId,
        source: pick(sources, v + d),
        checkedInAt,
      });
    }
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
  Staff roles seeded: OWNER, ADMIN, TRAINER (manager@ / coach@shaper.fit)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/* ============================================
   DZONGJUK (DSTS) — Comprehensive Mock Data
   Structured for easy backend API replacement
   ============================================ */

/* === Helper: Generate dates === */
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/* === Exam Windows / Registration Periods === */
export const examWindows = [
  {
    id: 'EXM-2026-001',
    title: 'DSTS Examination - July 2026',
    examDate: '2026-08-15',
    registrationStart: '2026-06-01',
    registrationEnd: '2026-07-15',
    maxCapacity: 150,
    currentRegistrations: 142,
    waitlistCount: 12,
    status: 'registration_open',
    venue: 'Royal Institute of Management, Semtokha',
    paymentAmount: 500,
    createdBy: 'USR-002',
    createdAt: '2026-05-15T10:00:00Z'
  },
  {
    id: 'EXM-2026-002',
    title: 'DSTS Examination - December 2026',
    examDate: '2026-12-10',
    registrationStart: '2026-10-01',
    registrationEnd: '2026-11-15',
    maxCapacity: 200,
    currentRegistrations: 0,
    waitlistCount: 0,
    status: 'published',
    venue: 'Thimphu Technical Training Institute',
    paymentAmount: 500,
    createdBy: 'USR-002',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'EXM-2025-003',
    title: 'DSTS Examination - January 2026',
    examDate: '2026-01-20',
    registrationStart: '2025-11-01',
    registrationEnd: '2025-12-15',
    maxCapacity: 120,
    currentRegistrations: 118,
    waitlistCount: 5,
    status: 'results_declared',
    venue: 'College of Science and Technology, Phuentsholing',
    paymentAmount: 450,
    createdBy: 'USR-002',
    createdAt: '2025-10-15T10:00:00Z'
  }
];

/* === Applications === */
export const applications = [
  {
    id: 'APP-2026-0001',
    examId: 'EXM-2026-001',
    testTakerId: 'USR-006',
    testTakerName: 'Pema Choden',
    cid: '1006',
    email: 'pema.choden@gmail.com',
    phone: '+975-17123456',
    dob: '1995-03-15',
    gender: 'Female',
    dzongkhag: 'Thimphu',
    gewog: 'Kawang',
    education: 'Bachelor of Arts',
    institution: 'Sherubtse College',
    employmentStatus: 'Employed',
    organization: 'Ministry of Education',
    registrationNumber: 'DSTS-2026-07-0001',
    status: 'verified',
    paymentStatus: 'paid',
    paymentAmount: 500,
    paymentDate: '2026-06-15T10:30:00Z',
    submittedAt: '2026-06-15T09:00:00Z',
    verifiedAt: '2026-06-18T14:30:00Z',
    verifiedBy: 'USR-002',
    remarks: '',
    documents: [
      { name: 'Citizenship ID Card', type: 'cid_card', status: 'verified', url: '#' },
      { name: 'Passport Photo', type: 'photo', status: 'verified', url: '#' },
      { name: 'Education Certificate', type: 'education', status: 'verified', url: '#' }
    ],
    isWithinCapacity: true,
    statusHistory: [
      { status: 'submitted', timestamp: '2026-06-15T09:00:00Z', by: 'Pema Choden' },
      { status: 'under_review', timestamp: '2026-06-17T10:00:00Z', by: 'Karma Wangchuk' },
      { status: 'verified', timestamp: '2026-06-18T14:30:00Z', by: 'Karma Wangchuk' }
    ]
  },
  {
    id: 'APP-2026-0002',
    examId: 'EXM-2026-001',
    testTakerId: 'TT-002',
    testTakerName: 'Tshering Yangzom',
    cid: '11108008008',
    email: 'tshering.y@gmail.com',
    phone: '+975-17234567',
    dob: '1998-08-22',
    gender: 'Female',
    dzongkhag: 'Paro',
    gewog: 'Shaba',
    education: 'Class XII',
    institution: 'Paro Higher Secondary School',
    employmentStatus: 'Student',
    organization: '',
    registrationNumber: 'DSTS-2026-07-0002',
    status: 'approved',
    paymentStatus: 'paid',
    paymentAmount: 500,
    paymentDate: '2026-06-16T11:00:00Z',
    submittedAt: '2026-06-16T09:30:00Z',
    verifiedAt: '2026-06-19T11:00:00Z',
    verifiedBy: 'USR-002',
    remarks: '',
    documents: [
      { name: 'Citizenship ID Card', type: 'cid_card', status: 'verified', url: '#' },
      { name: 'Passport Photo', type: 'photo', status: 'verified', url: '#' }
    ],
    isWithinCapacity: true,
    statusHistory: [
      { status: 'submitted', timestamp: '2026-06-16T09:30:00Z', by: 'Tshering Yangzom' },
      { status: 'verified', timestamp: '2026-06-19T11:00:00Z', by: 'Karma Wangchuk' },
      { status: 'approved', timestamp: '2026-06-19T11:30:00Z', by: 'Karma Wangchuk' }
    ]
  },
  {
    id: 'APP-2026-0003',
    examId: 'EXM-2026-001',
    testTakerId: 'TT-003',
    testTakerName: 'Jigme Namgyal',
    cid: '11109009009',
    email: 'jigme.n@gmail.com',
    phone: '+975-17345678',
    dob: '1992-11-05',
    gender: 'Male',
    dzongkhag: 'Punakha',
    gewog: 'Toewang',
    education: 'Master of Public Administration',
    institution: 'Royal Institute of Management',
    employmentStatus: 'Employed',
    organization: 'Royal Civil Service Commission',
    registrationNumber: null,
    status: 'submitted',
    paymentStatus: 'paid',
    paymentAmount: 500,
    paymentDate: '2026-07-01T08:00:00Z',
    submittedAt: '2026-07-01T07:30:00Z',
    verifiedAt: null,
    verifiedBy: null,
    remarks: '',
    documents: [
      { name: 'Citizenship ID Card', type: 'cid_card', status: 'pending', url: '#' },
      { name: 'Passport Photo', type: 'photo', status: 'pending', url: '#' },
      { name: 'Employment Certificate', type: 'employment', status: 'pending', url: '#' }
    ],
    isWithinCapacity: true,
    statusHistory: [
      { status: 'submitted', timestamp: '2026-07-01T07:30:00Z', by: 'Jigme Namgyal' }
    ]
  },
  {
    id: 'APP-2026-0004',
    examId: 'EXM-2026-001',
    testTakerId: 'TT-004',
    testTakerName: 'Dechen Zangmo',
    cid: '11110010010',
    email: 'dechen.z@gmail.com',
    phone: '+975-17456789',
    dob: '2000-05-18',
    gender: 'Female',
    dzongkhag: 'Bumthang',
    gewog: 'Chhoekhor',
    education: 'Diploma in IT',
    institution: 'Jigme Namgyel Engineering College',
    employmentStatus: 'Unemployed',
    organization: '',
    registrationNumber: null,
    status: 'returned',
    paymentStatus: 'paid',
    paymentAmount: 500,
    paymentDate: '2026-06-20T09:00:00Z',
    submittedAt: '2026-06-20T08:30:00Z',
    verifiedAt: null,
    verifiedBy: 'USR-002',
    remarks: 'Photo does not meet requirements. Please upload a clear passport-size photo.',
    documents: [
      { name: 'Citizenship ID Card', type: 'cid_card', status: 'verified', url: '#' },
      { name: 'Passport Photo', type: 'photo', status: 'rejected', url: '#' }
    ],
    isWithinCapacity: true,
    statusHistory: [
      { status: 'submitted', timestamp: '2026-06-20T08:30:00Z', by: 'Dechen Zangmo' },
      { status: 'returned', timestamp: '2026-06-22T10:00:00Z', by: 'Karma Wangchuk', remarks: 'Photo does not meet requirements' }
    ]
  },
  {
    id: 'APP-2026-0005',
    examId: 'EXM-2026-001',
    testTakerId: 'TT-005',
    testTakerName: 'Sangay Thinley',
    cid: '11111011011',
    email: 'sangay.t@gmail.com',
    phone: '+975-17567890',
    dob: '1988-01-25',
    gender: 'Male',
    dzongkhag: 'Wangdue Phodrang',
    gewog: 'Athang',
    education: 'Bachelor of Commerce',
    institution: 'Gaeddu College of Business Studies',
    employmentStatus: 'Employed',
    organization: 'Bank of Bhutan',
    registrationNumber: 'DSTS-2026-07-0005',
    status: 'absent',
    paymentStatus: 'paid',
    paymentAmount: 500,
    paymentDate: '2026-06-10T10:00:00Z',
    submittedAt: '2026-06-10T09:00:00Z',
    verifiedAt: '2026-06-15T10:00:00Z',
    verifiedBy: 'USR-002',
    remarks: 'Marked absent - did not appear for Writing and Listening skills',
    documents: [
      { name: 'Citizenship ID Card', type: 'cid_card', status: 'verified', url: '#' },
      { name: 'Passport Photo', type: 'photo', status: 'verified', url: '#' }
    ],
    isWithinCapacity: true,
    absentSkills: ['Writing', 'Listening'],
    statusHistory: [
      { status: 'submitted', timestamp: '2026-06-10T09:00:00Z', by: 'Sangay Thinley' },
      { status: 'verified', timestamp: '2026-06-15T10:00:00Z', by: 'Karma Wangchuk' },
      { status: 'approved', timestamp: '2026-06-15T10:30:00Z', by: 'Karma Wangchuk' },
      { status: 'absent', timestamp: '2026-08-15T16:00:00Z', by: 'Karma Wangchuk', remarks: 'Did not appear' }
    ]
  }
];

/* === Band Scores === */
export const bandScores = [
  {
    id: 'BS-001',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0001',
    testTakerName: 'Pema Choden',
    cid: '1006',
    registrationNumber: 'DSTS-2026-01-0001',
    writing: 6.5,
    reading: 7.0,
    listening: 6.0,
    speaking: 7.5,
    average: 6.75,
    status: 'published',
    enteredBy: 'USR-004',
    enteredAt: '2026-02-01T10:00:00Z',
    committeeMembers: ['Ugyen Tenzin', 'Kinley Dorji', 'Tshering Pem']
  },
  {
    id: 'BS-002',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0002',
    testTakerName: 'Tshering Yangzom',
    cid: '11108008008',
    registrationNumber: 'DSTS-2026-01-0002',
    writing: 5.0,
    reading: 5.5,
    listening: 5.0,
    speaking: 6.0,
    average: 5.375,
    status: 'published',
    enteredBy: 'USR-004',
    enteredAt: '2026-02-01T11:00:00Z',
    committeeMembers: ['Ugyen Tenzin', 'Kinley Dorji', 'Tshering Pem']
  },
  {
    id: 'BS-003',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0003',
    testTakerName: 'Dorji Wangchuk',
    cid: '11112012012',
    registrationNumber: 'DSTS-2026-01-0003',
    writing: 8.0,
    reading: 7.5,
    listening: 8.5,
    speaking: 8.0,
    average: 8.0,
    status: 'published',
    enteredBy: 'USR-004',
    enteredAt: '2026-02-01T12:00:00Z',
    committeeMembers: ['Ugyen Tenzin', 'Kinley Dorji', 'Tshering Pem']
  },
  {
    id: 'BS-004',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0004',
    testTakerName: 'Chimi Dema',
    cid: '11113013013',
    registrationNumber: 'DSTS-2026-01-0004',
    writing: 4.5,
    reading: 5.0,
    listening: 4.0,
    speaking: 5.5,
    average: 4.75,
    status: 'published',
    enteredBy: 'USR-004',
    enteredAt: '2026-02-01T13:00:00Z',
    committeeMembers: ['Ugyen Tenzin', 'Kinley Dorji', 'Tshering Pem']
  }
];

/* === Appeals / Re-evaluations === */
export const appeals = [
  {
    id: 'APL-001',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0002',
    testTakerName: 'Tshering Yangzom',
    cid: '11108008008',
    registrationNumber: 'DSTS-2026-01-0002',
    skills: ['Writing', 'Listening'],
    reason: 'I believe my writing and listening scores do not reflect my actual performance during the examination.',
    paymentStatus: 'paid',
    paymentAmount: 300,
    status: 'pending_committee',
    submittedAt: '2026-02-10T09:00:00Z',
    originalScores: { writing: 5.0, listening: 5.0 },
    revisedScores: null,
    committeeRemarks: null,
    chiefApproval: null,
    statusHistory: [
      { status: 'submitted', timestamp: '2026-02-10T09:00:00Z', by: 'Tshering Yangzom' },
      { status: 'payment_completed', timestamp: '2026-02-10T09:15:00Z', by: 'System' },
      { status: 'pending_committee', timestamp: '2026-02-10T09:15:00Z', by: 'System' }
    ]
  },
  {
    id: 'APL-002',
    examId: 'EXM-2025-003',
    applicationId: 'APP-2025-0004',
    testTakerName: 'Chimi Dema',
    cid: '11113013013',
    registrationNumber: 'DSTS-2026-01-0004',
    skills: ['Speaking'],
    reason: 'I would like to appeal my speaking score as I felt the evaluation did not account for my dialect variations.',
    paymentStatus: 'paid',
    paymentAmount: 200,
    status: 'approved',
    submittedAt: '2026-02-12T11:00:00Z',
    originalScores: { speaking: 5.5 },
    revisedScores: { speaking: 6.5 },
    committeeRemarks: 'After re-evaluation, the speaking score has been revised upward.',
    chiefApproval: 'approved',
    chiefRemarks: 'Score revision approved based on committee recommendation.',
    statusHistory: [
      { status: 'submitted', timestamp: '2026-02-12T11:00:00Z', by: 'Chimi Dema' },
      { status: 'payment_completed', timestamp: '2026-02-12T11:10:00Z', by: 'System' },
      { status: 'pending_committee', timestamp: '2026-02-12T11:10:00Z', by: 'System' },
      { status: 'revision_requested', timestamp: '2026-02-15T14:00:00Z', by: 'Ugyen Tenzin' },
      { status: 'pending_chief_approval', timestamp: '2026-02-15T14:00:00Z', by: 'System' },
      { status: 'approved', timestamp: '2026-02-16T10:00:00Z', by: 'Dorji Wangmo' }
    ]
  }
];

/* === Certificates === */
export const certificates = [
  {
    id: 'CERT-2026-0001',
    examId: 'EXM-2025-003',
    certificateNumber: 'DSTS-2026-0001',
    holderName: 'Pema Choden',
    registrationNumber: 'DSTS-2026-01-0001',
    scoreSnapshot: {
      scores: { WRITING: 6.5, READING: 7.0, LISTENING: 6.0, SPEAKING: 7.5 },
      overallScore: 6.75,
    },
    bandLabel: 'Band 6.75',
    cefrLevel: 'B2',
    issuedAt: '2026-02-15T00:00:00.000Z',
    validUntil: '2028-02-15',
    verificationToken: 'DSTS-CERT-2026-0001-VERIFY',
    status: 'ACTIVE',
    downloadCount: 3
  },
  {
    id: 'CERT-2026-0002',
    examId: 'EXM-2025-003',
    certificateNumber: 'DSTS-2026-0002',
    holderName: 'Dorji Wangchuk',
    registrationNumber: 'DSTS-2026-01-0003',
    scoreSnapshot: {
      scores: { WRITING: 8.0, READING: 7.5, LISTENING: 8.5, SPEAKING: 8.0 },
      overallScore: 8.0,
    },
    bandLabel: 'Band 8.0',
    cefrLevel: 'C1',
    issuedAt: '2026-02-15T00:00:00.000Z',
    validUntil: '2028-02-15',
    verificationToken: 'DSTS-CERT-2026-0002-VERIFY',
    status: 'ACTIVE',
    downloadCount: 1
  },
  {
    id: 'CERT-2026-0003',
    examId: 'EXM-2025-003',
    certificateNumber: 'DSTS-2026-0003',
    holderName: 'Chimi Dema',
    registrationNumber: 'DSTS-2026-01-0004',
    scoreSnapshot: {
      scores: { WRITING: 4.5, READING: 5.0, LISTENING: 4.0, SPEAKING: 6.5 },
      overallScore: 5.0,
    },
    bandLabel: 'Band 5.0',
    cefrLevel: 'B1',
    issuedAt: '2026-02-20T00:00:00.000Z',
    validUntil: '2028-02-20',
    verificationToken: 'DSTS-CERT-2026-0003-VERIFY',
    status: 'ACTIVE',
    downloadCount: 0
  }
];

/* === Question Papers === */
export const questionPapers = [
  {
    id: 'QP-2025-001',
    examId: 'EXM-2025-003',
    title: 'DSTS Writing Test - January 2026',
    skill: 'Writing',
    fileName: 'DSTS_Writing_Jan2026.pdf',
    fileSize: '2.4 MB',
    uploadedBy: 'USR-003',
    uploadedByName: 'Tshering Pem',
    uploadedAt: '2026-01-10T10:00:00Z',
    isEncrypted: true,
    status: 'published',
    hasAnswerSheet: true
  },
  {
    id: 'QP-2025-002',
    examId: 'EXM-2025-003',
    title: 'DSTS Reading Test - January 2026',
    skill: 'Reading',
    fileName: 'DSTS_Reading_Jan2026.pdf',
    fileSize: '3.1 MB',
    uploadedBy: 'USR-003',
    uploadedByName: 'Tshering Pem',
    uploadedAt: '2026-01-10T11:00:00Z',
    isEncrypted: true,
    status: 'published',
    hasAnswerSheet: true
  },
  {
    id: 'QP-2025-003',
    examId: 'EXM-2025-003',
    title: 'DSTS Listening Test - January 2026',
    skill: 'Listening',
    fileName: 'DSTS_Listening_Jan2026.pdf',
    fileSize: '1.8 MB',
    uploadedBy: 'USR-003',
    uploadedByName: 'Tshering Pem',
    uploadedAt: '2026-01-10T12:00:00Z',
    isEncrypted: true,
    status: 'published',
    hasAnswerSheet: true
  },
  {
    id: 'QP-2025-004',
    examId: 'EXM-2025-003',
    title: 'DSTS Speaking Test - January 2026',
    skill: 'Speaking',
    fileName: 'DSTS_Speaking_Jan2026.pdf',
    fileSize: '1.2 MB',
    uploadedBy: 'USR-003',
    uploadedByName: 'Tshering Pem',
    uploadedAt: '2026-01-10T13:00:00Z',
    isEncrypted: true,
    status: 'published',
    hasAnswerSheet: false
  }
];

/* === Committee Members === */
export const committeeMembers = [
  {
    id: 'CM-001',
    examId: 'EXM-2025-003',
    userId: 'USR-004',
    name: 'Ugyen Tenzin',
    role: 'Committee Head',
    isHead: true,
    addedAt: '2026-01-25T10:00:00Z'
  },
  {
    id: 'CM-002',
    examId: 'EXM-2025-003',
    userId: 'USR-007',
    name: 'Kinley Dorji',
    role: 'Committee Member',
    isHead: false,
    addedAt: '2026-01-25T10:00:00Z'
  },
  {
    id: 'CM-003',
    examId: 'EXM-2025-003',
    userId: 'USR-003',
    name: 'Tshering Pem',
    role: 'Committee Member',
    isHead: false,
    addedAt: '2026-01-25T10:00:00Z'
  }
];

/* === Notifications === */
export const notifications = [
  {
    id: 'NOT-001',
    userId: 'USR-006',
    title: 'Application Verified',
    message: 'Your application for DSTS Examination - July 2026 has been verified. Registration number: DSTS-2026-07-0001',
    type: 'success',
    read: false,
    createdAt: daysAgo(2)
  },
  {
    id: 'NOT-002',
    userId: 'USR-002',
    title: 'New Application Received',
    message: 'Jigme Namgyal has submitted a new application for DSTS Examination - July 2026.',
    type: 'info',
    read: false,
    createdAt: daysAgo(1)
  },
  {
    id: 'NOT-003',
    userId: 'USR-004',
    title: 'Re-evaluation Submitted',
    message: 'Tshering Yangzom has submitted a re-evaluation request for Writing and Listening scores.',
    type: 'warning',
    read: true,
    createdAt: daysAgo(5)
  },
  {
    id: 'NOT-004',
    userId: 'USR-005',
    title: 'Score Revision Request',
    message: 'The Examination Committee has submitted a score revision request for Chimi Dema. Your approval is required.',
    type: 'warning',
    read: false,
    createdAt: daysAgo(3)
  }
];

/* === Master Configuration === */
export const masterConfig = {
  certificateValidity: 24, // months
  registrationFee: 500,
  appealFee: 200,
  appealFeePerSkill: 100,
  maxBandScore: 9,
  minBandScore: 1,
  bandScoreStep: 0.5,
  skills: ['Writing', 'Reading', 'Listening', 'Speaking'],
  bandLevels: [
    { min: 8.5, max: 9.0, level: 'C2', description: 'Mastery' },
    { min: 7.0, max: 8.0, level: 'C1', description: 'Effective Operational Proficiency' },
    { min: 5.5, max: 6.5, level: 'B2', description: 'Vantage' },
    { min: 4.0, max: 5.0, level: 'B1', description: 'Threshold' },
    { min: 2.5, max: 3.5, level: 'A2', description: 'Waystage' },
    { min: 1.0, max: 2.0, level: 'A1', description: 'Breakthrough' }
  ],
  certificateTemplate: {
    paperSize: 'A4',
    orientation: 'landscape',
    title: 'Dzongkha Standard Testing System Certificate',
    declarationStatement: 'This is to certify that the above-named candidate has appeared for the Dzongkha Standard Test and has achieved the following band scores.',
    leftLogo: 'bhutan_emblem.png',
    rightLogo: 'dcdd_logo.png',
    authorizedSignatureName: 'Director General, DCDD',
    borderImage: 'certificate_border.png'
  },
  notificationTemplates: {
    applicationReceived: 'Dear {name}, your application for {examTitle} has been received. Application ID: {appId}',
    applicationVerified: 'Dear {name}, your application has been verified. Registration Number: {regNumber}',
    applicationReturned: 'Dear {name}, your application requires corrections: {remarks}',
    resultDeclared: 'Dear {name}, the results for {examTitle} have been declared. Please log in to view your scores.',
    appealResult: 'Dear {name}, your re-evaluation request for {examTitle} has been processed. Status: {status}'
  }
};

/* === Dashboard Statistics === */
export const dashboardStats = {
  dcdd: {
    totalRegistrations: 142,
    pendingVerifications: 15,
    approvedApplications: 118,
    absentees: 8,
    waitlisted: 12,
    certificatesGenerated: 110,
    activeAppeals: 3,
    totalExams: 3
  },
  testTaker: {
    totalExams: 2,
    certificates: 1,
    pendingAppeals: 0,
    currentStatus: 'verified'
  }
};

/* === Roles and Permissions for Admin === */
export const systemRoles = [
  {
    id: 'ROLE-001',
    name: 'System Administrator',
    code: 'admin',
    description: 'Full system access including user and role management',
    userCount: 1,
    permissions: {
      users: { create: true, read: true, update: true, delete: true },
      roles: { create: true, read: true, update: true, delete: true },
      registration: { create: true, read: true, update: true, delete: true },
      verification: { create: true, read: true, update: true, delete: true },
      attendance: { create: true, read: true, update: true, delete: true },
      questions: { create: true, read: true, update: true, delete: true },
      scores: { create: true, read: true, update: true, delete: true },
      appeals: { create: true, read: true, update: true, delete: true },
      certificates: { create: true, read: true, update: true, delete: true },
      reports: { create: true, read: true, update: true, delete: true },
      masters: { create: true, read: true, update: true, delete: true },
      audit: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-002',
    name: 'DCDD Administrator',
    code: 'dcdd',
    description: 'Registration management, verification, attendance, and system configuration',
    userCount: 3,
    permissions: {
      users: { create: false, read: true, update: false, delete: false },
      roles: { create: false, read: false, update: false, delete: false },
      registration: { create: true, read: true, update: true, delete: false },
      verification: { create: true, read: true, update: true, delete: false },
      attendance: { create: true, read: true, update: true, delete: false },
      questions: { create: false, read: true, update: false, delete: false },
      scores: { create: false, read: true, update: false, delete: false },
      appeals: { create: false, read: true, update: false, delete: false },
      certificates: { create: false, read: true, update: false, delete: false },
      reports: { create: true, read: true, update: false, delete: false },
      masters: { create: true, read: true, update: true, delete: false },
      audit: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-003',
    name: 'Exam Head',
    code: 'exam_head',
    description: 'Question paper upload and exam document management',
    userCount: 1,
    permissions: {
      questions: { create: true, read: true, update: true, delete: true },
      scores: { create: false, read: true, update: false, delete: false },
      reports: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-004',
    name: 'Committee Head',
    code: 'committee_head',
    description: 'Band score entry and re-evaluation management',
    userCount: 1,
    permissions: {
      scores: { create: true, read: true, update: true, delete: false },
      appeals: { create: false, read: true, update: true, delete: false },
      reports: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-005',
    name: 'Committee Member',
    code: 'committee_member',
    description: 'View-only access to submitted scores',
    userCount: 5,
    permissions: {
      scores: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-006',
    name: 'Chief Executive',
    code: 'chief_executive',
    description: 'Approval of score revision requests',
    userCount: 1,
    permissions: {
      appeals: { create: false, read: true, update: true, delete: false },
      reports: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'ROLE-007',
    name: 'Test Taker',
    code: 'test_taker',
    description: 'Registration, result viewing, certificate access, and re-evaluation submission',
    userCount: 500,
    permissions: {
      registration: { create: true, read: true, update: true, delete: false },
      certificates: { create: false, read: true, update: false, delete: false },
      appeals: { create: true, read: true, update: false, delete: false }
    }
  }
];

/* === System Users for Admin === */
export const systemUsers = [
  { id: 'USR-001', name: 'Sonam Dorji', email: 'system.admin@demo.com', cid: '1001', role: 'System Administrator', roleCode: 'admin', status: 'active', lastLogin: daysAgo(0) },
  { id: 'USR-002', name: 'Karma Wangchuk', email: 'dcdd.admin@demo.com', cid: '1002', role: 'DCDD Administrator', roleCode: 'dcdd', status: 'active', lastLogin: daysAgo(0) },
  { id: 'USR-003', name: 'Tshering Pem', email: 'exam.head@demo.com', cid: '1003', role: 'Exam Head', roleCode: 'exam_head', status: 'active', lastLogin: daysAgo(2) },
  { id: 'USR-004', name: 'Ugyen Tenzin', email: 'committee.head@demo.com', cid: '1004', role: 'Committee Head', roleCode: 'committee_head', status: 'active', lastLogin: daysAgo(1) },
  { id: 'USR-005', name: 'Dorji Wangmo', email: 'chief.executive@demo.com', cid: '1005', role: 'Chief Executive', roleCode: 'chief_executive', status: 'active', lastLogin: daysAgo(3) },
  { id: 'USR-006', name: 'Pema Choden', email: 'test.taker@demo.com', cid: '1006', role: 'Test Taker', roleCode: 'test_taker', status: 'active', lastLogin: daysAgo(0) },
  { id: 'USR-007', name: 'Kinley Dorji', email: 'member@dsts.bt', cid: '1007', role: 'Committee Member', roleCode: 'committee_member', status: 'active', lastLogin: daysAgo(4) }
];

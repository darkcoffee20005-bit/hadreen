/** Arabic strings for the invitation pages. Iraqi-friendly, warm and short. */
const strings = {
  greetingGuest: (name: string) => `أهلاً ${name}`,
  greetingGeneric: 'أهلاً وسهلاً',
  invitationLead: 'يسعدنا دعوتكم لحفل زفاف',
  and: 'و',
  openInvitation: 'افتحوا الدعوة',
  shell: {
    preparing: 'جاري تجهيز الدعوة…',
    skip: 'تخطّي الحركة',
    mute: 'كتم الصوت',
    unmute: 'تشغيل الصوت',
    gyro: 'حرّكوا تلفونكم',
    play3d: 'شغّلوا النسخة ثلاثية الأبعاد',
    weddingOf: 'دعوة زفاف',
    scratchDay: 'اليوم',
    scratchMonth: 'الشهر',
    scratchYear: 'السنة',
    scratchTile: (part: string) => `امسحوا لكشف ${part}`,
    holdHint: 'استمروا بالضغط…',
  },
  skipToContent: 'انتقلوا إلى تفاصيل الدعوة',
  demoRibbon: 'دعوة تجريبية: الأسماء والتواريخ والأماكن أمثلة',
  draftRibbon: 'مسودة: هذي الدعوة ما منشورة بعد',
  countdown: {
    title: 'باقي على الفرحة',
    days: 'يوم',
    hours: 'ساعة',
    minutes: 'دقيقة',
    seconds: 'ثانية',
    today: 'الفرحة اليوم!',
  },
  programme: 'برنامج الحفل',
  venue: {
    title: 'مكان الحفل',
    map: 'افتحوا الموقع',
    calendar: 'أضيفوا للتقويم',
    deviceCalendar: 'تقويم الجهاز',
    googleCalendar: 'تقويم Google',
  },
  dressCode: { title: 'لباس الحفل', ladies: 'للسيدات', gentlemen: 'للرجال' },
  notes: 'ملاحظات',
  rsvp: {
    title: 'تأكيد الحضور',
    question: 'راح تشرّفونا؟',
    yes: 'حاضرين',
    no: 'نعتذر',
    seats: 'عدد الحضور',
    seatsMax: (max: string) => `لغاية ${max}`,
    decrease: 'أقل',
    increase: 'أكثر',
    name: 'الاسم',
    namePlaceholder: 'مثلاً: عائلة أبو حسين',
    message: 'كلمة للعروسين (اختياري)',
    submit: 'أرسلوا الرد',
    update: 'حدّثوا الرد',
    sending: 'جاري الإرسال…',
    thanksYes: 'وصل ردّكم، ننتظركم!',
    thanksNo: 'وصل ردّكم، شكراً لكم.',
    editableUntil: (date: string) => `تقدرون تعدّلون ردّكم لغاية ${date}`,
    closed: 'انتهى موعد تأكيد الحضور.',
    personalOnly: 'تأكيد الحضور متاح من الرابط الشخصي فقط.',
    current: 'ردّكم الحالي',
    attendingSeats: (n: string) => `حاضرين (${n})`,
    declined: 'معتذرين',
    errors: {
      INVALID_INPUT: 'تأكدوا من المعلومات وجرّبوا مرة ثانية.',
      NAME_REQUIRED: 'اكتبوا اسمكم لطفاً.',
      SEATS_MIN: 'اختاروا عدد الحضور.',
      SEATS_MAX: 'عدد الحضور أكثر من المسموح.',
      DEADLINE_PASSED: 'انتهى موعد تأكيد الحضور.',
      INVALID_LINK: 'الرابط غير صالح.',
      OPEN_RSVP_CLOSED: 'تأكيد الحضور متاح من الرابط الشخصي فقط.',
      RATE_LIMITED: 'محاولات كثيرة، جرّبوا بعد شوية.',
      NETWORK: 'صار خطأ بالاتصال، جرّبوا مرة ثانية.',
    },
  },
  footer: {
    text: 'دعوة من حاضرين، للطلب راسلونا على انستكرام',
  },
  notFound: {
    title: 'ما لگينا هذي الدعوة',
    body: 'تأكدوا من الرابط، أو اطلبوه مرة ثانية من أصحاب الدعوة.',
  },
} as const;

type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : { [K in keyof T]: Widen<T[K]> };

/** The shape every language provides (Arabic is the reference). */
export type InviteDict = Widen<typeof strings>;

export const ar: InviteDict = strings;

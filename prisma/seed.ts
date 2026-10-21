/**
 * Seeds one demo wedding per template (slug demo-<template>) with example guests and answers.
 * Everything here is an example and is labelled as such on the page (demo ribbon, "(مثال)").
 * Safe to re-run: demo weddings are replaced, real weddings are untouched.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { customAlphabet } from 'nanoid';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import { demoSchedule } from '../src/lib/demo';
import { SECRET_LENGTH, TOKEN_ALPHABET, TOKEN_LENGTH } from '../src/lib/validation/patterns';
import { TEMPLATES } from '../src/templates';
import type { TemplateId } from '../src/lib/invite/types';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL! }),
});
const token = customAlphabet(TOKEN_ALPHABET, TOKEN_LENGTH);
const secret = customAlphabet(TOKEN_ALPHABET, SECRET_LENGTH);
const pin = customAlphabet('0123456789', 6);

const NIKKAH_VERSE =
  'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً';

interface Demo {
  groom: string;
  bride: string;
  venue: string;
  area: string;
  verse?: string;
  intro: string;
  schedule: { time: string; title: string; subtitle: string }[];
  dress: { label: string; swatches: string[]; ladies: string; gentlemen: string };
  notes: string;
  originCity?: string;
}

const DEMOS: Record<TemplateId, Demo> = {
  'sacred-garden': {
    groom: 'آدم',
    bride: 'ليلى',
    venue: 'حديقة الورد (مثال)',
    area: 'بغداد',
    verse: NIKKAH_VERSE,
    intro: 'بقلوب يملؤها الفرح، نتشرّف بدعوتكم لحضور عقد قراننا ومشاركتنا أجمل لحظات العمر.',
    schedule: [
      { time: '17:30', title: 'عقد القران', subtitle: 'بحضور الأهل والأحبة' },
      { time: '19:00', title: 'حفل الاستقبال', subtitle: 'في الحديقة' },
      { time: '20:30', title: 'العشاء', subtitle: '' },
    ],
    dress: { label: 'ألوان ناعمة', swatches: ['#F2DED6', '#DCCDB9', '#5E7A55'], ladies: 'ألوان باستيل ناعمة', gentlemen: 'بدلة فاتحة أو دشداشة' },
    notes: 'الحفل في حديقة مفتوحة، نتمنى تجهيز ما يناسب نسمة المساء.',
  },
  'blossom-oud': {
    groom: 'كريم',
    bride: 'نور',
    venue: 'قصر الياسمين (مثال)',
    area: 'بغداد',
    intro: 'على أنغام العود وعطر الورد، نتمنى نشوفكم بليلتنا ونفرح سوا.',
    schedule: [
      { time: '19:00', title: 'استقبال الضيوف', subtitle: 'ضيافة وعود' },
      { time: '20:00', title: 'زفّة العروسين', subtitle: 'بالطبل والهلاهل' },
      { time: '21:30', title: 'العشاء', subtitle: '' },
    ],
    dress: { label: 'سهرة', swatches: ['#E7B9BC', '#B86A7A', '#C9A96E'], ladies: 'فساتين سهرة بألوان وردية أو ذهبية', gentlemen: 'بدلة رسمية' },
    notes: '',
  },
  'dolce-vita': {
    groom: 'يوسف',
    bride: 'مريم',
    venue: 'شرفة البحيرة (مثال)',
    area: 'أربيل',
    intro: 'صيف، بحيرة، وناس نحبهم. تعالوا نحتفل سوا بيوم ما ينتسى.',
    schedule: [
      { time: '18:00', title: 'الاستقبال على الشرفة', subtitle: 'عصائر وحلويات' },
      { time: '19:30', title: 'دخول العروسين', subtitle: '' },
      { time: '20:30', title: 'العشاء والسهرة', subtitle: '' },
    ],
    dress: { label: 'صيفي أنيق', swatches: ['#A9C7E4', '#FFFFFF', '#E8A3B4'], ladies: 'فساتين صيفية بألوان فاتحة', gentlemen: 'قميص وسروال فاتح' },
    notes: 'الحفل في الهواء الطلق.',
  },
  'royal-gold': {
    groom: 'أحمد',
    bride: 'سارة',
    venue: 'قاعة الاحتفالات (مثال)',
    area: 'بغداد',
    verse: NIKKAH_VERSE,
    intro: 'بكل الحب والامتنان، يسعدنا تشرّفونا بحضوركم وتشاركونا فرحة العمر.',
    schedule: [
      { time: '19:00', title: 'استقبال الضيوف', subtitle: '' },
      { time: '20:00', title: 'الزفّة', subtitle: 'بالطبل والهلاهل' },
      { time: '21:00', title: 'العشاء', subtitle: '' },
      { time: '22:30', title: 'قطع الكيك', subtitle: '' },
    ],
    dress: { label: 'رسمي', swatches: ['#F8F3E8', '#C9A96E', '#0B3D2E'], ladies: 'فساتين سهرة', gentlemen: 'بدلة رسمية' },
    notes: 'نتشرّف بحضوركم من بداية الحفل.',
  },
  'eternal-romance': {
    groom: 'زيد',
    bride: 'رنا',
    venue: 'قاعة الشموع (مثال)',
    area: 'البصرة',
    intro: 'قصتنا بدت بنظرة، وتكتمل بحضوركم. ننتظركم بليلة من العمر.',
    schedule: [
      { time: '19:30', title: 'الاستقبال', subtitle: '' },
      { time: '20:30', title: 'الرقصة الأولى', subtitle: '' },
      { time: '21:30', title: 'العشاء', subtitle: '' },
    ],
    dress: { label: 'سهرة', swatches: ['#6A1A2B', '#F8F3E8', '#C9A96E'], ladies: 'فساتين سهرة بالخمري أو العاجي', gentlemen: 'بدلة داكنة' },
    notes: '',
  },
  'destination-love': {
    groom: 'سيف',
    bride: 'ياسمين',
    venue: 'قاعة الضيافة (مثال)',
    area: 'بغداد',
    intro: 'من إسطنبول لبغداد، رحلتنا وصلت لأحلى محطة. حاضرين؟',
    schedule: [
      { time: '19:00', title: 'وصول الضيوف', subtitle: '' },
      { time: '20:00', title: 'دخول العروسين', subtitle: '' },
      { time: '21:00', title: 'العشاء والسهرة', subtitle: '' },
    ],
    dress: { label: 'أنيق', swatches: ['#0F2D29', '#F3EBDC', '#C9A96E'], ladies: 'فساتين سهرة', gentlemen: 'بدلة رسمية' },
    notes: '',
    originCity: 'istanbul',
  },
};

const GUESTS = [
  { name: 'عائلة أبو حسين', seats: 4, group: 'أهل العريس' },
  { name: 'بيت الحاج كريم', seats: 5, group: 'أهل العروس' },
  { name: 'عائلة الدكتور سامر', seats: 3, group: 'أصدقاء' },
  { name: 'الأستاذ مصطفى وعائلته', seats: 4, group: 'زملاء العمل' },
  { name: 'بيت أبو علي', seats: 6, group: 'الجيران' },
  { name: 'عائلة الحاج عبد الله', seats: 5, group: 'أهل العريس' },
  { name: 'بيت خالة سعاد', seats: 3, group: 'أهل العروس' },
  { name: 'عائلة المهندس ياسر', seats: 2, group: 'أصدقاء' },
  { name: 'بيت عمّو جاسم', seats: 4, group: 'أهل العريس' },
  { name: 'عائلة أم محمد', seats: 3, group: 'أهل العروس' },
  { name: 'الست زينب وعائلتها', seats: 3, group: 'زملاء العمل' },
  { name: 'بيت أبو مريم', seats: 4, group: 'الجيران' },
];

// [attending, seats, message] for the first guests; the rest have not answered.
const ANSWERS: [boolean, number, string][] = [
  [true, 4, 'ألف مبروك، الله يتمم على خير'],
  [true, 5, 'مبروك مقدماً، إن شاء الله حاضرين'],
  [false, 0, 'نعتذر لظرف سفر، ألف ألف مبروك'],
  [true, 3, 'الله يوفقكم ويسعدكم'],
  [true, 6, ''],
  [false, 0, ''],
  [true, 2, 'بالرفاه والبنين'],
];
const OPENED_ONLY = 2; // guests after the answers who opened but haven't replied

async function main() {
  // `--if-missing` (used by the deploy build): seed only a fresh database, never reset demos.
  if (process.argv.includes('--if-missing') && (await prisma.wedding.count({ where: { isDemo: true } })) > 0) {
    console.log('Demo weddings already exist; nothing to do.');
    return;
  }
  await prisma.wedding.deleteMany({ where: { isDemo: true } });
  const { date, deadline } = demoSchedule(new Date());
  const lines: string[] = [];

  for (const template of TEMPLATES) {
    const demo = DEMOS[template.id];
    const wedding = await prisma.wedding.create({
      data: {
        slug: `demo-${template.id}`,
        template: template.id,
        lang: 'ar',
        groomName: demo.groom,
        brideName: demo.bride,
        monogram: `${demo.groom[0]} & ${demo.bride[0]}`,
        dateTimeUtc: date,
        verse: demo.verse ?? null,
        intro: demo.intro,
        venueName: demo.venue,
        venueArea: demo.area,
        dressCode: demo.dress as Prisma.InputJsonValue,
        notes: demo.notes,
        rsvpDeadline: deadline,
        schedule: demo.schedule as Prisma.InputJsonValue,
        musicTrack: template.music.placeholder,
        originCity: demo.originCity ?? null,
        destinationCity: template.id === 'destination-love' ? 'baghdad' : null,
        status: 'live',
        isDemo: true,
        coupleSecret: secret(),
        couplePin: pin(),
      },
    });

    for (const [i, g] of GUESTS.entries()) {
      const guest = await prisma.guest.create({
        data: { weddingId: wedding.id, displayName: g.name, maxSeats: g.seats, group: g.group, token: token() },
      });
      const answer = ANSWERS[i];
      if (answer || i < ANSWERS.length + OPENED_ONLY) {
        await prisma.event.create({ data: { weddingId: wedding.id, guestId: guest.id, type: 'opened', userAgent: 'seed' } });
      }
      if (answer) {
        const [attending, seats, message] = answer;
        await prisma.rsvp.create({ data: { guestId: guest.id, attending, seats, message } });
      }
    }
    lines.push(`  ${template.nameAr.padEnd(18)} /i/${wedding.slug}   dashboard: /d/${wedding.slug}?k=${wedding.coupleSecret}  code: ${wedding.couplePin}`);
  }

  console.log(`Seeded ${TEMPLATES.length} demo weddings:\n${lines.join('\n')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

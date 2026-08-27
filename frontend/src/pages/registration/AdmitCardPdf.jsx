/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * PDF layout for the examination Admit Card / Hall Ticket. Built from
 * @react-pdf/renderer primitives (Document/Page/View/Text/Image), so it uses its
 * own StyleSheet rather than DOM/Tailwind markup. A candidate downloads this after
 * their exam registration is verified and carries it - with the original CID - to
 * the examination hall as proof of admission.
 */
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const BRAND = '#124143';
const GOLD = '#B47A11';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#D8DCDA';

const styles = StyleSheet.create({
  page: { paddingVertical: 34, paddingHorizontal: 38, fontFamily: 'Helvetica', color: INK, fontSize: 10 },

  frame: { borderWidth: 1.5, borderColor: BRAND, padding: 0, flexGrow: 1 },
  frameInner: { borderWidth: 0.75, borderColor: GOLD, margin: 3, flexGrow: 1, padding: 18 },

  watermark: {
    position: 'absolute', top: 300, left: 90, fontSize: 96, fontFamily: 'Helvetica-Bold',
    color: '#124143', opacity: 0.05, transform: 'rotate(-24deg)',
  },

  header: { alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: BRAND, paddingBottom: 12, marginBottom: 14 },
  crest: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  crestText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND },
  govt: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.5 },
  dept: { fontSize: 8, color: MUTED, marginTop: 2 },
  system: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND, marginTop: 8, letterSpacing: 0.5 },

  titleBar: { backgroundColor: BRAND, color: '#FFFFFF', alignSelf: 'center', paddingVertical: 5, paddingHorizontal: 22, borderRadius: 2, marginBottom: 16 },
  titleText: { fontSize: 12, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: '#FFFFFF' },

  body: { flexDirection: 'row', gap: 18 },
  photoCol: { width: 118, alignItems: 'center' },
  photoBox: { width: 108, height: 132, borderWidth: 1, borderColor: BRAND, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F5' },
  photo: { width: 108, height: 132, objectFit: 'cover' },
  photoPlaceholder: { fontSize: 8, color: MUTED },
  sigPad: { marginTop: 26, width: 108, borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 4, alignItems: 'center' },
  sigLabel: { fontSize: 7.5, color: MUTED },

  detailCol: { flexGrow: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: LINE, paddingVertical: 5 },
  label: { width: '38%', fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { width: '62%', fontSize: 10, fontFamily: 'Helvetica-Bold', color: INK },
  regValue: { width: '62%', fontSize: 11, fontFamily: 'Helvetica-Bold', color: GOLD },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  instruction: { flexDirection: 'row', marginBottom: 4, paddingRight: 8 },
  bullet: { width: 14, fontSize: 9, fontFamily: 'Helvetica-Bold', color: GOLD },
  instructionText: { flexGrow: 1, fontSize: 8.5, lineHeight: 1.5, color: INK },

  footer: { marginTop: 'auto', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerBlock: { width: '45%' },
  footerLine: { borderTopWidth: 0.75, borderTopColor: INK, marginTop: 24, paddingTop: 4 },
  footerLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INK },
  footerSub: { fontSize: 7.5, color: MUTED, marginTop: 1 },

  metaBar: { marginTop: 14, borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 7, color: MUTED },
});

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DEFAULT_INSTRUCTIONS = [
  'Candidates must report to the examination venue at the reporting time shown above. Entry is not permitted after the examination has begun.',
  'This admit card must be produced together with the original Citizenship Identity Card (CID) at the hall. Photocopies are not accepted.',
  'Bring your own blue or black ballpoint pen. Mobile phones, smart watches, and electronic devices are strictly prohibited inside the hall.',
  'The seat allotted by the invigilator must be occupied; candidates found at the wrong seat may be disqualified.',
  'Any form of malpractice will lead to cancellation of the examination and further disciplinary action.',
  'Retain this admit card until the results are declared and the certificate is issued.',
];

export default function AdmitCardDocument({
  candidate = {},
  exam = {},
  reportingTime = '08:30 AM',
  issuedAt = new Date().toISOString(),
  applicationId = '',
  instructions = DEFAULT_INSTRUCTIONS,
}) {
  return (
    <Document title={`DSTS Admit Card — ${candidate.registrationNumber || candidate.name || ''}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.frameInner}>
            <Text style={styles.watermark} fixed>DSTS</Text>

            <View style={styles.header}>
              <View style={styles.crest}><Text style={styles.crestText}>DCDD</Text></View>
              <Text style={styles.govt}>ROYAL GOVERNMENT OF BHUTAN</Text>
              <Text style={styles.dept}>Department of Culture and Dzongkha Development · Ministry of Home Affairs</Text>
              <Text style={styles.system}>DZONGKHA STANDARD TESTING SYSTEM</Text>
            </View>

            <View style={styles.titleBar}><Text style={styles.titleText}>ADMIT CARD</Text></View>

            <View style={styles.body}>
              <View style={styles.photoCol}>
                <View style={styles.photoBox}>
                  {candidate.photo
                    ? <Image src={candidate.photo} style={styles.photo} />
                    : <Text style={styles.photoPlaceholder}>PHOTOGRAPH</Text>}
                </View>
                <View style={styles.sigPad}><Text style={styles.sigLabel}>Candidate&apos;s Signature</Text></View>
              </View>

              <View style={styles.detailCol}>
                <View style={styles.row}>
                  <Text style={styles.label}>Registration No.</Text>
                  <Text style={styles.regValue}>{candidate.registrationNumber || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Full Name</Text>
                  <Text style={styles.value}>{candidate.name || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>CID No.</Text>
                  <Text style={styles.value}>{candidate.cid || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Date of Birth</Text>
                  <Text style={styles.value}>{fmtDate(candidate.dob)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Gender</Text>
                  <Text style={styles.value}>{candidate.gender || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Examination</Text>
                  <Text style={styles.value}>{exam.title || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Exam Code</Text>
                  <Text style={styles.value}>{exam.code || '—'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Examination Date</Text>
                  <Text style={styles.value}>{fmtDate(exam.examDate)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Reporting Time</Text>
                  <Text style={styles.value}>{reportingTime}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Venue</Text>
                  <Text style={styles.value}>{exam.venue || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions to Candidates</Text>
              {instructions.map((line, index) => (
                <View style={styles.instruction} key={index} wrap={false}>
                  <Text style={styles.bullet}>{index + 1}.</Text>
                  <Text style={styles.instructionText}>{line}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <View style={styles.footerBlock}>
                <View style={styles.footerLine} />
                <Text style={styles.footerLabel}>Controller of Examinations</Text>
                <Text style={styles.footerSub}>Department of Culture and Dzongkha Development</Text>
              </View>
              <View style={styles.footerBlock}>
                <View style={styles.footerLine} />
                <Text style={styles.footerLabel}>Official Seal</Text>
                <Text style={styles.footerSub}>Valid only when sealed by the issuing office</Text>
              </View>
            </View>

            <View style={styles.metaBar}>
              <Text style={styles.metaText}>Application ID: {applicationId || '—'}</Text>
              <Text style={styles.metaText}>Issued on {fmtDate(issuedAt)} · This is a system-generated document.</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

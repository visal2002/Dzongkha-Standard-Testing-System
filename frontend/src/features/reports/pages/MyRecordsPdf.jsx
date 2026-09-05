/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * PDF layout for the My Records export. Kept as its own file because
 * @react-pdf/renderer documents are built from its own primitives
 * (Document/Page/View/Text), not regular DOM/Tailwind markup.
 */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#666666', marginBottom: 20 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333333', paddingBottom: 6, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 6 },
  headerText: { fontSize: 8, textTransform: 'uppercase', color: '#333333' },
  cellDate: { width: '22%' },
  cellType: { width: '20%' },
  cellRef: { width: '36%' },
  cellStatus: { width: '22%' },
});

export default function MyRecordsDocument({ userName, generatedAt, rows = [] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>My Records</Text>
        <Text style={styles.subtitle}>{userName} - Generated {generatedAt}</Text>

        <View style={styles.headerRow}>
          <Text style={[styles.headerText, styles.cellDate]}>Date</Text>
          <Text style={[styles.headerText, styles.cellType]}>Type</Text>
          <Text style={[styles.headerText, styles.cellRef]}>Reference</Text>
          <Text style={[styles.headerText, styles.cellStatus]}>Status</Text>
        </View>

        {rows.map((row, index) => (
          <View style={styles.row} key={index} wrap={false}>
            <Text style={styles.cellDate}>{row.date}</Text>
            <Text style={styles.cellType}>{row.type}</Text>
            <Text style={styles.cellRef}>{row.reference}</Text>
            <Text style={styles.cellStatus}>{row.status}</Text>
          </View>
        ))}

        {rows.length === 0 && <Text>No records found.</Text>}
      </Page>
    </Document>
  );
}

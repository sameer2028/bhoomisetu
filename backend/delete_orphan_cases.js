const { query, queryRows } = require('./src/config/database');

async function main() {
  try {
    const allCases = await queryRows('SELECT id, case_code, parcel_id FROM acquisition_cases');
    console.log(`Total cases: ${allCases.length}`);
    const noParcelCases = allCases.filter(c => !c.parcel_id);
    console.log(`Cases without land: ${noParcelCases.length}`);

    // Delete cases without land
    if (noParcelCases.length > 0) {
      await query('DELETE FROM acquisition_cases WHERE parcel_id IS NULL');
      console.log(`Deleted ${noParcelCases.length} cases.`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

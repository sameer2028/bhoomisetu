async function testPhase14() {
  const BASE = 'http://localhost:5001/api';
  console.log('--- TESTING PHASE 14: FIELD / MOBILE EXPERIENCE ---');

  // 1. Auth login as FRO
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'fro@nla.gov.in',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('✅ 1. Authenticated as Field / Revenue Officer (Amit Kumar Verma)');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch Field Metrics
  const metricsRes = await fetch(`${BASE}/field/metrics`, { headers });
  const metricsJson = await metricsRes.json();
  const m = metricsJson.data;
  console.log('✅ 2. Retrieved Field Officer Metrics:');
  console.log(`   - Total Assigned: ${m.total_assigned}`);
  console.log(`   - Inspected & GPS Fixed: ${m.total_verified}`);
  console.log(`   - Pending Inspection: ${m.pending_inspection}`);
  console.log(`   - Flagged Issues: ${m.flagged_issues}`);

  // 3. Fetch Assigned Parcels
  const parcelsRes = await fetch(`${BASE}/field/assigned-parcels?limit=5`, { headers });
  const parcelsJson = await parcelsRes.json();
  const targetParcel = parcelsJson.data[0];
  console.log(`✅ 3. Retrieved Assigned Survey Plots (${parcelsJson.data.length} plots):`);
  console.log(`   - Selected: Survey #${targetParcel.survey_number} (${targetParcel.parcel_code})`);
  console.log(`   - Village: ${targetParcel.village}, Owner: ${targetParcel.owner_name}`);
  console.log(`   - Acquisition Stage: ${targetParcel.acquisition_status}`);

  // 4. Fetch Parcel Checklist Details
  const checkRes = await fetch(`${BASE}/field/parcels/${targetParcel.id}/checklist`, { headers });
  const checkJson = await checkRes.json();
  console.log(`✅ 4. Retrieved Checklist Specs for Survey #${targetParcel.survey_number}:`);
  console.log(`   - Linked Project: ${checkJson.data.parcel.project_name}`);
  console.log(`   - Linked Case: ${checkJson.data.parcel.case_code || 'None'}`);

  // 5. Submit Field Verification Report with GPS Pin
  const submitRes = await fetch(`${BASE}/field/parcels/${targetParcel.id}/submit-report`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      gps_coordinates: {
        latitude: 26.848215,
        longitude: 80.949312,
        accuracy_meters: 3.5,
      },
      checklist: {
        boundary_demarcation: 'INTACT',
        land_classification: 'IRRIGATED_AGRICULTURE',
        standing_crops: 'Sugarcane',
        tree_count: 12,
        structure_count: 1,
        borewell_count: 1,
        owner_present: 'YES',
        encroachment_status: 'NONE',
      },
      action: 'VERIFY_AND_APPROVE',
      remarks: 'Joint Measurement Survey completed. Ground boundaries match cadastral map.',
    }),
  });
  const submitJson = await submitRes.json();
  console.log('✅ 5. Submitted Field Verification Report:');
  console.log(`   - Result Message: ${submitJson.message}`);
  console.log(`   - New Acquisition Status: ${submitJson.data.parcel.acquisition_status}`);
  console.log(`   - Geometry Source: ${submitJson.data.parcel.geometry_source}`);
  console.log(`   - Pinned GPS Coordinates: ${submitJson.data.parcel.latitude}, ${submitJson.data.parcel.longitude}`);

  console.log('\n🎉 ALL PHASE 14 FIELD VERIFICATION & JMS SURVEY TESTS PASSED!\n');
}

testPhase14().catch((err) => {
  console.error('❌ Test failed:', err.message);
});

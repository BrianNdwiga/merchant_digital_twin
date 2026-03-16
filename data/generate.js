const fs = require('fs');
const path = require('path');

const businessTypes = ['retail','agriculture','services','manufacturing','transport','hospitality','education','healthcare'];
const locations = [
  'Nairobi','Kibera','Westlands','Gikomba','Mombasa','CBD','Kawangware','Kisumu',
  'Eldoret','Mathare','Karen','Nakuru','Thika','Nyeri','Ruiru','Rongai','Kitengela',
  'Machakos','Kajiado','Limuru','Kangemi','Kilimani','Eastleigh','Malindi','Nanyuki',
  'Kitale','Bungoma','Kakamega','Kisii','Meru','Garissa','Isiolo','Marsabit','Wajir',
  'Mandera','Lamu','Kilifi','Kwale','Voi','Embu','Kirinyaga','Muranga',
  'Kiambu','Karatina','Kerugoya','Nyahururu','Naivasha','Nakuru CBD','Eldoret CBD','Kisumu CBD'
];
const firstNames = [
  'Njeri','John','David','Mary','Hassan','Grace','Peter','Jane','Samuel','Lucy',
  'Sarah','James','Robert','Daniel','Ann','Joseph','Michael','Elizabeth','Francis',
  'Catherine','Patrick','Margaret','George','Ali','Stephen','Rose','Paul','Esther',
  'Moses','Ruth','Amina','Brian','Caroline','Dennis','Eunice','Felix','Gloria',
  'Henry','Irene','Julius','Kezia','Lawrence','Miriam','Nathan','Olivia','Philip',
  'Richard','Sylvia','Thomas','Victor','Winnie','Yusuf','Zipporah',
  'Aisha','Boniface','Charity','Dominic','Edith','Fredrick','Hellen',
  'Isaac','Jacinta','Kevin','Lilian','Martin','Nancy','Oscar','Priscilla',
  'Rebecca','Simon','Tabitha','Violet','Walter','Yvonne','Zachary'
];
const lastNames = [
  'Wanjiku','Ochieng','Kamau','Akinyi','Mohamed','Muthoni','Otieno','Wambui',
  'Kipchoge','Adhiambo','Wanjiru','Mwangi','Kimani','Kariuki','Njoki','Mutua',
  'Omondi','Wangari','Kibet','Nyambura','Onyango','Wairimu','Maina','Abdullahi',
  'Korir','Chebet','Wekesa','Auma','Nyaga','Wanjala','Njoroge','Owino','Gitau',
  'Simiyu','Barasa','Chesang','Rotich','Sang','Kiptoo','Langat','Ngetich','Bett',
  'Ruto','Koech','Mutai','Kigen','Chepkemoi','Jepkosgei','Koskei','Limo','Too'
];
const bizSuffixes = ['Shop','Enterprises','Traders','Supplies','Services','Solutions','Agency','Store','Market','Farm','Hub','Centre','Group','Associates','Ventures'];
const bizPrefixes = ['Mama','Baba','New','Best','Top','Star','Gold','Green','Royal','Prime','Elite','Smart','Quick','City','Metro'];

const networkProfiles = [
  ...Array(35).fill('4G_GOOD'),
  ...Array(25).fill('4G_UNSTABLE'),
  ...Array(25).fill('3G_POOR'),
  ...Array(15).fill('2G_EDGE')
];
const literacyLevels = [
  ...Array(30).fill('basic'),
  ...Array(45).fill('intermediate'),
  ...Array(25).fill('advanced')
];
const incomeLevels = [
  ...Array(35).fill('low'),
  ...Array(45).fill('medium'),
  ...Array(20).fill('high')
];
const deviceTypes = [
  ...Array(40).fill('android_mid'),
  ...Array(25).fill('android_low_end'),
  ...Array(20).fill('ios'),
  ...Array(15).fill('feature_phone')
];
const genders = [...Array(52).fill('Male'), ...Array(48).fill('Female')];
const educationLevels = [...Array(20).fill('Primary'), ...Array(45).fill('Secondary'), ...Array(35).fill('University')];
const languages = [...Array(65).fill('Swahili'), ...Array(35).fill('English')];
const internetFreq = [...Array(50).fill('Daily'), ...Array(25).fill('Weekly'), ...Array(15).fill('Monthly'), ...Array(10).fill('Rarely')];
const speedTestDates = [
  '2025-11-10','2025-11-15','2025-11-20','2025-12-01','2025-12-10',
  '2025-12-20','2026-01-05','2026-01-15','2026-02-01','2026-02-15','2026-03-01'
];

const netDefaults = {
  '4G_GOOD':     { latency:[80,130],    loss:[0.1,0.5], bw:[5000,10000], sig:[85,98], stab:'stable',   peak:1.5  },
  '4G_UNSTABLE': { latency:[250,400],   loss:[1.5,2.5], bw:[3000,5000],  sig:[60,75], stab:'moderate', peak:1.6  },
  '3G_POOR':     { latency:[700,900],   loss:[2.5,4.0], bw:[600,1000],   sig:[38,52], stab:'unstable', peak:1.4  },
  '2G_EDGE':     { latency:[1400,1800], loss:[5.0,7.0], bw:[150,220],    sig:[20,32], stab:'poor',     peak:1.35 }
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const rnd  = (min, max) => Math.round(Math.random() * (max - min) + min);
const rndF = (min, max, dec) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));

const COUNT = 1000;
const onboardingRows = ['merchant_id,business_name,business_type,location,phone,email,income_level,digital_literacy,device_type,network_profile,patience_score,retry_threshold'];
const bioRows        = ['merchantId,ownerName,ownerAge,gender,educationLevel,yearsInBusiness,employeeCount,monthlyRevenue,previousBankingExperience,mobileBankingUser,preferredLanguage,operatingHours,businessRegistered,taxCompliant,hasSmartphone,internetAccessFrequency'];
const netRows        = ['merchantId,networkProfile,avgLatencyMs,packetLossPercent,bandwidthKbps,signalStrength,connectionStability,peakHourLatencyMs,offPeakLatencyMs,dataUsageMB,lastSpeedTestDate'];

for (let i = 1; i <= COUNT; i++) {
  const id        = 'M' + String(i).padStart(4, '0');
  const firstName = pick(firstNames);
  const lastName  = pick(lastNames);
  const location  = pick(locations);
  const bizType   = pick(businessTypes);
  const network   = pick(networkProfiles);
  const literacy  = pick(literacyLevels);
  const income    = pick(incomeLevels);
  const device    = pick(deviceTypes);
  const gender    = pick(genders);
  const education = pick(educationLevels);
  const lang      = pick(languages);
  const freq      = pick(internetFreq);

  // Patience correlated with literacy
  const baseP   = literacy === 'advanced' ? 0.7 : literacy === 'intermediate' ? 0.5 : 0.3;
  const patience = Math.min(0.95, rndF(baseP, baseP + 0.3, 2));
  const retry    = patience > 0.7 ? rnd(1,3) : patience > 0.4 ? rnd(2,4) : rnd(3,6);

  // Business name - no apostrophes to avoid CSV issues
  const bizName = Math.random() > 0.5
    ? firstName + ' ' + location + ' ' + pick(bizSuffixes)
    : pick(bizPrefixes) + ' ' + location + ' ' + pick(bizSuffixes);

  const phone     = '+2547' + String(rnd(10000000, 99999999));
  const emailName = (firstName + '.' + lastName).toLowerCase();
  const email     = emailName + '@example.com';

  // Bio
  const age        = rnd(22, 65);
  const years      = rnd(1, Math.min(age - 18, 30));
  const employees  = income === 'high' ? rnd(5,25) : income === 'medium' ? rnd(2,8) : rnd(1,3);
  const revenue    = income === 'high' ? rnd(200000,800000) : income === 'medium' ? rnd(50000,200000) : rnd(15000,55000);
  const hasBanking = (income !== 'low' && literacy !== 'basic') ? 'Yes' : (Math.random() > 0.6 ? 'Yes' : 'No');
  const mobileUser = (device !== 'feature_phone' && literacy !== 'basic') ? 'Yes' : (Math.random() > 0.7 ? 'Yes' : 'No');
  const registered = income === 'high' ? 'Yes' : (Math.random() > 0.45 ? 'Yes' : 'No');
  const taxComp    = registered === 'Yes' && Math.random() > 0.3 ? 'Yes' : 'No';
  const smartphone = device !== 'feature_phone' ? 'Yes' : 'No';
  const openH      = rnd(5, 10);
  const closeH     = rnd(17, 22);
  const hours      = openH + 'am-' + (closeH - 12) + 'pm';

  // Network
  const nd          = netDefaults[network];
  const avgLatency  = rnd(nd.latency[0], nd.latency[1]);
  const packetLoss  = rndF(nd.loss[0], nd.loss[1], 1);
  const bandwidth   = rnd(nd.bw[0], nd.bw[1]);
  const signal      = rnd(nd.sig[0], nd.sig[1]);
  const peakLatency = Math.round(avgLatency * nd.peak);
  const offPeak     = Math.round(avgLatency * 0.75);
  const dataUsage   = network === '4G_GOOD' ? rnd(200,600) : network === '4G_UNSTABLE' ? rnd(100,300) : network === '3G_POOR' ? rnd(50,150) : rnd(20,60);
  const speedDate   = pick(speedTestDates);

  onboardingRows.push([id, bizName, bizType, location, phone, email, income, literacy, device, network, patience, retry].join(','));
  bioRows.push([id, firstName + ' ' + lastName, age, gender, education, years, employees, revenue, hasBanking, mobileUser, lang, hours, registered, taxComp, smartphone, freq].join(','));
  netRows.push([id, network, avgLatency, packetLoss, bandwidth, signal, nd.stab, peakLatency, offPeak, dataUsage, speedDate].join(','));
}

const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'merchant_onboarding_data.csv'), onboardingRows.join('\n'));
fs.writeFileSync(path.join(outDir, 'merchant_bio_profile.csv'),     bioRows.join('\n'));
fs.writeFileSync(path.join(outDir, 'network_metrics.csv'),          netRows.join('\n'));

console.log('Generated ' + COUNT + ' merchants');
console.log('  merchant_onboarding_data.csv: ' + (onboardingRows.length - 1) + ' rows');
console.log('  merchant_bio_profile.csv:     ' + (bioRows.length - 1) + ' rows');
console.log('  network_metrics.csv:          ' + (netRows.length - 1) + ' rows');

// Quick distribution summary
const networks = {};
onboardingRows.slice(1).forEach(r => { const n = r.split(',')[9]; networks[n] = (networks[n]||0)+1; });
console.log('\nNetwork distribution:', networks);
const literacy = {};
onboardingRows.slice(1).forEach(r => { const l = r.split(',')[7]; literacy[l] = (literacy[l]||0)+1; });
console.log('Literacy distribution:', literacy);

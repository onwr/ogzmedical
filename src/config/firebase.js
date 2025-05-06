import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAI8Ww110hBXNNb4vyNH1o6QBeDNYahqBk',
  authDomain: 'ogzmed-e2405.firebaseapp.com',
  projectId: 'ogzmed-e2405',
  storageBucket: 'ogzmed-e2405.firebasestorage.app',
  messagingSenderId: '1007886207305',
  appId: '1:1007886207305:web:41e14d1d09c5ab8a4ff298',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize test data in Firestore
export const initializeTestData = async () => {
  const testGroups = [
    {
      title: 'BİYOKİMYA',
      tests: [
        { name: 'Açlık Kan Şekeri', basePrice: 100 },
        { name: 'Tokluk Kan Şekeri', basePrice: 100 },
        { name: 'HbA1C', basePrice: 330 },
        { name: 'OGTT', basePrice: 120 },
        { name: 'ÜRE', basePrice: 120 },
        { name: 'Total Protein', basePrice: 120 },
        { name: 'KREATİNİN', basePrice: 120 },
        { name: 'Albumin', basePrice: 100 },
        { name: 'Ürik Asit', basePrice: 100 },
        { name: 'Total Kolesterol', basePrice: 120 },
        { name: 'HDL-Kolesterol', basePrice: 120 },
        { name: 'LDL-Kolestrol', basePrice: 120 },
        { name: 'Trigliserid', basePrice: 120 },
        { name: 'Total Lipid', basePrice: 120 },
        { name: 'Total Bilirubin', basePrice: 120 },
        { name: 'Direkt Bilirubin', basePrice: 120 },
        { name: 'SGOT (AST)', basePrice: 120 },
        { name: 'SGPT (ALT)', basePrice: 100 },
        { name: 'CPK (Total)', basePrice: 150 },
        { name: 'CK-MB', basePrice: 150 },
        { name: 'Myoglobin', basePrice: 500 },
        { name: 'LDH', basePrice: 120 },
        { name: 'Troponin T', basePrice: 500 },
        { name: 'Amilaz', basePrice: 150 },
        { name: 'Lipaz', basePrice: 150 },
        { name: 'Alkalen Fosfotaz (ALP)', basePrice: 100 },
        { name: 'GGT', basePrice: 125 },
        { name: 'Na', basePrice: 125 },
        { name: 'K', basePrice: 125 },
        { name: 'Cl', basePrice: 125 },
        { name: 'Fosfor', basePrice: 125 },
        { name: 'Kalsiyum', basePrice: 125 },
        { name: 'Magnezyum', basePrice: 150 },
        { name: 'Demir', basePrice: 150 },
        { name: 'TDBK (Demir Bağlama)', basePrice: 150 },
        { name: 'Kolinesteraz', basePrice: 300 },
        { name: 'Çinko', basePrice: 400 },
        { name: 'Bakır', basePrice: 650 },
        { name: 'Çinko (Eritrosit)', basePrice: 1000 },
        { name: 'Selenyum Serum', basePrice: 950 },
        { name: 'Pro BNP', basePrice: 1500 },
        { name: 'Seruloplazmin', basePrice: 1000 },
      ],
    },
    {
      title: 'HEMATOLOJİ',
      tests: [
        { name: 'Hemogram', basePrice: 400 },
        { name: 'Periferik Yayma', basePrice: 500 },
        { name: 'Protrombin Zamanı (INR)', basePrice: 300 },
        { name: 'APTT', basePrice: 300 },
        { name: 'Fibrinojen', basePrice: 600 },
        { name: 'Direkt Coombs', basePrice: 550 },
        { name: 'İndirekt Coombs', basePrice: 550 },
        { name: 'Kan Grubu', basePrice: 400 },
        { name: 'Sedimentasyon', basePrice: 150 },
        { name: 'Vitamin B12', basePrice: 250 },
        { name: 'Folik Asit', basePrice: 200 },
        { name: 'Ferritin', basePrice: 250 },
        { name: 'G6PD', basePrice: 750 },
        { name: 'HB.Elektroforez', basePrice: 600 },
        { name: 'D-Dimer', basePrice: 1000 },
      ],
    },
    {
      title: 'HEPATİT MARKERLERİ',
      tests: [
        { name: 'HbsAg', basePrice: 400 },
        { name: 'Anti Hbs', basePrice: 400 },
        { name: 'HAV IGM', basePrice: 700 },
        { name: 'HAV IGG', basePrice: 700 },
        { name: 'Anti HBC Total', basePrice: 700 },
        { name: 'Anti HBC IgM', basePrice: 700 },
        { name: 'Anti Hbe', basePrice: 600 },
        { name: 'Anti HCV', basePrice: 450 },
        { name: 'Anti HIV (1+2) p24', basePrice: 500 },
      ],
    },
    {
      title: 'MİKROBİYOLOJİ',
      tests: [
        { name: 'Strep A Antijeni (Boğaz)', basePrice: 400 },
        { name: 'Boğaz Kültürü', basePrice: 450 },
        { name: 'İdrar Kültürü', basePrice: 450 },
        { name: 'Gaita Kültürü', basePrice: 500 },
        { name: 'Balgam Kültürü', basePrice: 450 },
        { name: 'Mantar Kültürü', basePrice: 450 },
        { name: 'AF Genital', basePrice: 2000 },
        { name: 'Yara Kültürü', basePrice: 500 },
        { name: 'Vagen Kültürü', basePrice: 1000 },
        { name: 'Üretrel Akıntı Kültürü', basePrice: 1000 },
        { name: 'Klamidiye Antijeni', basePrice: 500 },
        { name: 'İnfluensa A/B Tarama Testi', basePrice: 750 },
        { name: 'RSV/Adeno Virüs Tarama Testi', basePrice: 750 },
        { name: 'PORTÖR (Burun Boğaz Gaita)', basePrice: 400 },
      ],
    },
    {
      title: 'SEROLOJİ',
      tests: [
        { name: 'Toxoplazma IgG', basePrice: 450 },
        { name: 'Toxoplazma IgM', basePrice: 450 },
        { name: 'Rubella IgG', basePrice: 450 },
        { name: 'Rubella IgM', basePrice: 150 },
        { name: 'CMV IgG', basePrice: 450 },
        { name: 'CMV IgM', basePrice: 450 },
        { name: 'Helico Pylori IgG', basePrice: 600 },
        { name: 'ANA', basePrice: 750 },
        { name: 'Anti ds DNA', basePrice: 1000 },
        { name: 'Brusella Agg.', basePrice: 300 },
        { name: 'Grubel Widal', basePrice: 400 },
        { name: 'VDRL', basePrice: 350 },
        { name: 'TPHA', basePrice: 700 },
        { name: 'Doku Transglutaminaz IGG', basePrice: 600 },
        { name: 'Doku Transglutaminaz IGA', basePrice: 600 },
        { name: 'Anti Gliadin IGG', basePrice: 1000 },
        { name: 'Anti Gliadin IGA', basePrice: 1000 },
        { name: 'IgA', basePrice: 450 },
        { name: 'IgG', basePrice: 450 },
        { name: 'IgM', basePrice: 450 },
        { name: 'IgE', basePrice: 500 },
        { name: 'SİSTATİN C', basePrice: 1000 },
        { name: 'EBV EBNA IGG', basePrice: 2000 },
        { name: 'EBV VCA IGG', basePrice: 600 },
        { name: 'EBV VCA IGM', basePrice: 600 },
        { name: 'ASO', basePrice: 150 },
        { name: 'CRP', basePrice: 200 },
        { name: 'RF', basePrice: 150 },
      ],
    },
    {
      title: 'GAİTA',
      tests: [
        { name: 'Gaita Tektiki', basePrice: 300 },
        { name: 'Gaitada Parazit', basePrice: 300 },
        { name: 'Gaitada Gizli Kan', basePrice: 400 },
        { name: 'Amip Antijeni', basePrice: 500 },
        { name: 'Selofan Band', basePrice: 300 },
        { name: 'Rota-Adenovirüs', basePrice: 300 },
        { name: 'Helicobakter Antijen', basePrice: 600 },
      ],
    },
    {
      title: 'HORMONLAR',
      tests: [
        { name: 'TT3', basePrice: 250 },
        { name: 'TT4', basePrice: 250 },
        { name: 'FT3', basePrice: 250 },
        { name: 'FT4', basePrice: 250 },
        { name: 'TSH', basePrice: 250 },
        { name: 'ANTİ TPO', basePrice: 400 },
        { name: 'ANTİ Tiroglobulin', basePrice: 450 },
        { name: 'Tiroglobulin', basePrice: 600 },
        { name: 'LH', basePrice: 250 },
        { name: 'FSH', basePrice: 250 },
        { name: 'Estradiol (E2)', basePrice: 300 },
        { name: 'BHCG (gebelik testi)', basePrice: 600 },
        { name: 'Progesteron', basePrice: 400 },
        { name: 'Prolaktin', basePrice: 300 },
        { name: 'Total Testesteron', basePrice: 350 },
        { name: 'Serbest Testesteron', basePrice: 600 },
        { name: 'DHEA SO4', basePrice: 330 },
        { name: 'Kortizol', basePrice: 300 },
        { name: 'Androstenedion', basePrice: 1000 },
        { name: 'Homosistein', basePrice: 750 },
        { name: 'Anti Mullerian Hormon', basePrice: 1500 },
        { name: 'C-Peptit', basePrice: 600 },
        { name: 'PTH', basePrice: 250 },
        { name: 'İnsulin', basePrice: 300 },
        { name: '25 OH Vitamin D3', basePrice: 660 },
        { name: 'SHGB', basePrice: 660 },
        { name: 'Growth Hormon', basePrice: 800 },
        { name: 'P ANCA', basePrice: 1200 },
        { name: 'ACTH (Sabah)', basePrice: 900 },
      ],
    },
    {
      title: 'İDRAR',
      tests: [
        { name: 'Tam İdrar Tahlili', basePrice: 300 },
        { name: 'Kreatinin Klirens Testi', basePrice: 500 },
        { name: 'Redüktan Madde', basePrice: 500 },
        { name: 'İdrarda İyot', basePrice: 1000 },
        { name: 'İdrarda Mikroalbumin', basePrice: 500 },
      ],
    },
    {
      title: 'TÜMÖR MARKERLERİ',
      tests: [
        { name: 'CEA', basePrice: 500 },
        { name: 'CA 15,3', basePrice: 500 },
        { name: 'CA 19,9', basePrice: 500 },
        { name: 'CA 125', basePrice: 500 },
        { name: 'CA 72,4', basePrice: 900 },
        { name: 'AFP', basePrice: 500 },
        { name: 'TOTAL PSA', basePrice: 500 },
        { name: 'FREE PSA', basePrice: 500 },
      ],
    },
    {
      title: 'ANTENATAL TESTLER',
      tests: [
        { name: 'İkili Tarama testi', basePrice: 2500 },
        { name: 'Dörtlü Tarama Testi', basePrice: 3000 },
      ],
    },
    {
      title: 'ALLERJİ',
      tests: [
        { name: 'Pediatrik Allerji paneli (27 paremetre)', basePrice: 3600 },
        { name: 'Gıda Allerji Paneli (35 parametre)', basePrice: 4000 },
        { name: 'Solunum Allerji Paneli (29 parametre)', basePrice: 4000 },
        { name: 'Alex-2 Moleküler Allerji Testi', basePrice: 12000 },
        { name: 'Gıda İntolerans Testi (216)', basePrice: 11000 },
      ],
    },
    {
      title: 'MULTİPLEX PCR TESTLERİ',
      tests: [
        { name: 'Solunum Patojenleri PCR Paneli', basePrice: 2500 },
        { name: 'Cinsel yolla bulaşan hastalıklar PCR Testleri', basePrice: 4000 },
        { name: 'Human Papilloma Virüs Genotiplendirme PCR', basePrice: 4500 },
        { name: 'Gastroenterit etkenleri Mikroorgamizma PCR paneli (MX 24 panel)', basePrice: 5500 },
        { name: 'Solunum Yolu Microorganizma PCR Testleri', basePrice: 5000 },
      ],
    },
  ];

  try {
    for (const group of testGroups) {
      const groupRef = await addDoc(collection(db, 'testGroups'), {
        title: group.title,
        createdAt: new Date(),
      });

      for (const test of group.tests) {
        await addDoc(collection(db, 'tests'), {
          ...test,
          category: group.title,
          groupId: groupRef.id,
          createdAt: new Date(),
        });
      }
    }
    console.log('Test data initialized successfully');
  } catch (error) {
    console.error('Error initializing test data:', error);
  }
};

// Initialize package data in Firestore
export const initializePackageData = async () => {
  const packages = [
    {
      name: 'Böbrek Fonksiyon Testi',
      tests: [
        'ÜRE',
        'KREATİNİN',
        'Na',
        'K',
        'Cl',
        'Kalsiyum',
        'Fosfor',
        'Albumin',
      ],
    },
    {
      name: 'Tarama Testleri',
      tests: [
        'İkili Tarama testi',
        'Dörtlü Tarama Testi',
      ],
    },
  ];

  try {
    for (const pkg of packages) {
      await addDoc(collection(db, 'packages'), {
        ...pkg,
        createdAt: new Date(),
      });
    }
    console.log('Package data initialized successfully');
  } catch (error) {
    console.error('Error initializing package data:', error);
  }
};

// Database Schema
/*
Collections:
1. applications
   - id: string
   - patientInfo: {
       name: string
       phone: string
       email: string
       // other patient details
     }
   - selectedTests: [{
       testId: string
       price: number
       cost: number  // Added test cost
     }]
   - dealerId: string
   - totalPrice: number
   - totalCost: number  // Added total cost
   - status: string
   - createdAt: timestamp
   - updatedAt: timestamp

2. dealers
   - id: string
   - name: string
   - email: string
   - phone: string
   - address: string
   - isActive: boolean
   - createdAt: timestamp

3. tests
   - id: string
   - name: string
   - category: string
   - basePrice: number
   - baseCost: number  // Added base cost
   - createdAt: timestamp

4. dealerPrices
   - id: string
   - dealerId: string
   - testId: string
   - price: number
   - cost: number  // Added dealer-specific cost
   - updatedAt: timestamp

5. financials
   - id: string
   - dealerId: string
   - date: timestamp
   - type: string (income/expense)
   - amount: number
   - description: string
   - applicationId: string (optional)
   - category: string (test_cost/patient_payment/other)  // Added category
   - testId: string (optional)  // Added for test-specific entries
   - createdAt: timestamp

6. testGroups
   - id: string
   - title: string
   - createdAt: timestamp

7. packages
   - id: string
   - name: string
   - tests: string[]
   - createdAt: timestamp

8. financialReports
   - id: string
   - period: string (daily/weekly/monthly)
   - startDate: timestamp
   - endDate: timestamp
   - totalRevenue: number
   - totalCost: number
   - profit: number
   - dealerId: string (optional)
   - createdAt: timestamp
*/ 
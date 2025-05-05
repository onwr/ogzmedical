import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyD_okhVPiXxG05L3pDYjp0Z9UDH8BtHOB4',
  authDomain: 'ogzmed-74ed1.firebaseapp.com',
  projectId: 'ogzmed-74ed1',
  storageBucket: 'ogzmed-74ed1.firebasestorage.app',
  messagingSenderId: '1048497019492',
  appId: '1:1048497019492:web:144011fce4f74785ef9d71',
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
        { name: 'Açlık Kan Şekeri', price: 100 },
        { name: 'Tokluk Kan Şekeri', price: 100 },
        { name: 'HbA1C', price: 330 },
        { name: 'OGTT', price: 120 },
        { name: 'ÜRE', price: 120 },
        { name: 'Total Protein', price: 120 },
        { name: 'KREATİNİN', price: 120 },
        { name: 'Albumin', price: 100 },
        { name: 'Ürik Asit', price: 100 },
        { name: 'Total Kolesterol', price: 120 },
        { name: 'HDL-Kolesterol', price: 120 },
        { name: 'LDL-Kolestrol', price: 120 },
        { name: 'Trigliserid', price: 120 },
        { name: 'Total Lipid', price: 120 },
        { name: 'Total Bilirubin', price: 120 },
        { name: 'Direkt Bilirubin', price: 120 },
        { name: 'SGOT (AST)', price: 120 },
        { name: 'SGPT (ALT)', price: 100 },
        { name: 'CPK (Total)', price: 150 },
        { name: 'CK-MB', price: 150 },
        { name: 'Myoglobin', price: 500 },
        { name: 'LDH', price: 120 },
        { name: 'Troponin T', price: 500 },
        { name: 'Amilaz', price: 150 },
        { name: 'Lipaz', price: 150 },
        { name: 'Alkalen Fosfotaz (ALP)', price: 100 },
        { name: 'GGT', price: 125 },
        { name: 'Na', price: 125 },
        { name: 'K', price: 125 },
        { name: 'Cl', price: 125 },
        { name: 'Fosfor', price: 125 },
        { name: 'Kalsiyum', price: 125 },
        { name: 'Magnezyum', price: 150 },
        { name: 'Demir', price: 150 },
        { name: 'TDBK (Demir Bağlama)', price: 150 },
        { name: 'Kolinesteraz', price: 300 },
        { name: 'Çinko', price: 400 },
        { name: 'Bakır', price: 650 },
        { name: 'Çinko (Eritrosit)', price: 1000 },
        { name: 'Selenyum Serum', price: 950 },
        { name: 'Pro BNP', price: 1500 },
        { name: 'Seruloplazmin', price: 1000 },
      ],
    },
    {
      title: 'HEMATOLOJİ',
      tests: [
        { name: 'Hemogram', price: 400 },
        { name: 'Periferik Yayma', price: 500 },
        { name: 'Protrombin Zamanı (INR)', price: 300 },
        { name: 'APTT', price: 300 },
        { name: 'Fibrinojen', price: 600 },
        { name: 'Direkt Coombs', price: 550 },
        { name: 'İndirekt Coombs', price: 550 },
        { name: 'Kan Grubu', price: 400 },
        { name: 'Sedimentasyon', price: 150 },
        { name: 'Vitamin B12', price: 250 },
        { name: 'Folik Asit', price: 200 },
        { name: 'Ferritin', price: 250 },
        { name: 'G6PD', price: 750 },
        { name: 'HB.Elektroforez', price: 600 },
        { name: 'D-Dimer', price: 1000 },
      ],
    },
    {
      title: 'HEPATİT MARKERLERİ',
      tests: [
        { name: 'HbsAg', price: 400 },
        { name: 'Anti Hbs', price: 400 },
        { name: 'HAV IGM', price: 700 },
        { name: 'HAV IGG', price: 700 },
        { name: 'Anti HBC Total', price: 700 },
        { name: 'Anti HBC IgM', price: 700 },
        { name: 'Anti Hbe', price: 600 },
        { name: 'Anti HCV', price: 450 },
        { name: 'Anti HIV (1+2) p24', price: 500 },
      ],
    },
    {
      title: 'MİKROBİYOLOJİ',
      tests: [
        { name: 'Strep A Antijeni (Boğaz)', price: 400 },
        { name: 'Boğaz Kültürü', price: 450 },
        { name: 'İdrar Kültürü', price: 450 },
        { name: 'Gaita Kültürü', price: 500 },
        { name: 'Balgam Kültürü', price: 450 },
        { name: 'Mantar Kültürü', price: 450 },
        { name: 'AF Genital', price: 2000 },
        { name: 'Yara Kültürü', price: 500 },
        { name: 'Vagen Kültürü', price: 1000 },
        { name: 'Üretrel Akıntı Kültürü', price: 1000 },
        { name: 'Klamidiye Antijeni', price: 500 },
        { name: 'İnfluensa A/B Tarama Testi', price: 750 },
        { name: 'RSV/Adeno Virüs Tarama Testi', price: 750 },
        { name: 'PORTÖR (Burun Boğaz Gaita)', price: 400 },
      ],
    },
    {
      title: 'SEROLOJİ',
      tests: [
        { name: 'Toxoplazma IgG', price: 450 },
        { name: 'Toxoplazma IgM', price: 450 },
        { name: 'Rubella IgG', price: 450 },
        { name: 'Rubella IgM', price: 150 },
        { name: 'CMV IgG', price: 450 },
        { name: 'CMV IgM', price: 450 },
        { name: 'Helico Pylori IgG', price: 600 },
        { name: 'ANA', price: 750 },
        { name: 'Anti ds DNA', price: 1000 },
        { name: 'Brusella Agg.', price: 300 },
        { name: 'Grubel Widal', price: 400 },
        { name: 'VDRL', price: 350 },
        { name: 'TPHA', price: 700 },
        { name: 'Doku Transglutaminaz IGG', price: 600 },
        { name: 'Doku Transglutaminaz IGA', price: 600 },
        { name: 'Anti Gliadin IGG', price: 1000 },
        { name: 'Anti Gliadin IGA', price: 1000 },
        { name: 'IgA', price: 450 },
        { name: 'IgG', price: 450 },
        { name: 'IgM', price: 450 },
        { name: 'IgE', price: 500 },
        { name: 'SİSTATİN C', price: 1000 },
        { name: 'EBV EBNA IGG', price: 2000 },
        { name: 'EBV VCA IGG', price: 600 },
        { name: 'EBV VCA IGM', price: 600 },
        { name: 'ASO', price: 150 },
        { name: 'CRP', price: 200 },
        { name: 'RF', price: 150 },
      ],
    },
    {
      title: 'GAİTA',
      tests: [
        { name: 'Gaita Tektiki', price: 300 },
        { name: 'Gaitada Parazit', price: 300 },
        { name: 'Gaitada Gizli Kan', price: 400 },
        { name: 'Amip Antijeni', price: 500 },
        { name: 'Selofan Band', price: 300 },
        { name: 'Rota-Adenovirüs', price: 300 },
        { name: 'Helicobakter Antijen', price: 600 },
      ],
    },
    {
      title: 'HORMONLAR',
      tests: [
        { name: 'TT3', price: 250 },
        { name: 'TT4', price: 250 },
        { name: 'FT3', price: 250 },
        { name: 'FT4', price: 250 },
        { name: 'TSH', price: 250 },
        { name: 'ANTİ TPO', price: 400 },
        { name: 'ANTİ Tiroglobulin', price: 450 },
        { name: 'Tiroglobulin', price: 600 },
        { name: 'LH', price: 250 },
        { name: 'FSH', price: 250 },
        { name: 'Estradiol (E2)', price: 300 },
        { name: 'BHCG (gebelik testi)', price: 600 },
        { name: 'Progesteron', price: 400 },
        { name: 'Prolaktin', price: 300 },
        { name: 'Total Testesteron', price: 350 },
        { name: 'Serbest Testesteron', price: 600 },
        { name: 'DHEA SO4', price: 330 },
        { name: 'Kortizol', price: 300 },
        { name: 'Androstenedion', price: 1000 },
        { name: 'Homosistein', price: 750 },
        { name: 'Anti Mullerian Hormon', price: 1500 },
        { name: 'C-Peptit', price: 600 },
        { name: 'PTH', price: 250 },
        { name: 'İnsulin', price: 300 },
        { name: '25 OH Vitamin D3', price: 660 },
        { name: 'SHGB', price: 660 },
        { name: 'Growth Hormon', price: 800 },
        { name: 'P ANCA', price: 1200 },
        { name: 'ACTH (Sabah)', price: 900 },
      ],
    },
    {
      title: 'İDRAR',
      tests: [
        { name: 'Tam İdrar Tahlili', price: 300 },
        { name: 'Kreatinin Klirens Testi', price: 500 },
        { name: 'Redüktan Madde', price: 500 },
        { name: 'İdrarda İyot', price: 1000 },
        { name: 'İdrarda Mikroalbumin', price: 500 },
      ],
    },
    {
      title: 'TÜMÖR MARKERLERİ',
      tests: [
        { name: 'CEA', price: 500 },
        { name: 'CA 15,3', price: 500 },
        { name: 'CA 19,9', price: 500 },
        { name: 'CA 125', price: 500 },
        { name: 'CA 72,4', price: 900 },
        { name: 'AFP', price: 500 },
        { name: 'TOTAL PSA', price: 500 },
        { name: 'FREE PSA', price: 500 },
      ],
    },
    {
      title: 'ANTENATAL TESTLER',
      tests: [
        { name: 'İkili Tarama testi', price: 2500 },
        { name: 'Dörtlü Tarama Testi', price: 3000 },
      ],
    },
    {
      title: 'ALLERJİ',
      tests: [
        { name: 'Pediatrik Allerji paneli (27 paremetre)', price: 3600 },
        { name: 'Gıda Allerji Paneli (35 parametre)', price: 4000 },
        { name: 'Solunum Allerji Paneli (29 parametre)', price: 4000 },
        { name: 'Alex-2 Moleküler Allerji Testi', price: 12000 },
        { name: 'Gıda İntolerans Testi (216)', price: 11000 },
      ],
    },
    {
      title: 'MULTİPLEX PCR TESTLERİ',
      tests: [
        { name: 'Solunum Patojenleri PCR Paneli', price: 2500 },
        { name: 'Cinsel yolla bulaşan hastalıklar PCR Testleri', price: 4000 },
        { name: 'Human Papilloma Virüs Genotiplendirme PCR', price: 4500 },
        { name: 'Gastroenterit etkenleri Mikroorgamizma PCR paneli (MX 24 panel)', price: 5500 },
        { name: 'Solunum Yolu Microorganizma PCR Testleri', price: 5000 },
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
     }]
   - dealerId: string
   - totalPrice: number
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
   - code: string
   - description: string
   - category: string
   - isActive: boolean
   - basePrice: number
   - createdAt: timestamp

4. dealerPrices
   - id: string
   - dealerId: string
   - testId: string
   - price: number
   - updatedAt: timestamp

5. financials
   - id: string
   - dealerId: string
   - date: timestamp
   - type: string (income/expense)
   - amount: number
   - description: string
   - applicationId: string (optional)
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
*/ 
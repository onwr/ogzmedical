import { useState } from 'react';

const Header = ({ onPatientInfoChange, initialValues = {}, setIsModalOpen }) => {
  const [patientInfo, setPatientInfo] = useState({
    name: initialValues.name || '',
    birthDate: initialValues.birthDate || '',
    requestDate: initialValues.requestDate || '',
    tcNo: initialValues.tcNo || '',
    gender: initialValues.gender || '',
    photo: initialValues.photo || '',
    extraPhoto: initialValues.extraPhoto || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newPatientInfo = { ...patientInfo, [name]: value };
    setPatientInfo(newPatientInfo);
    onPatientInfoChange(newPatientInfo);
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadingType(type);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(
        'https://api.imgbb.com/1/upload?key=48e17415bdf865ecc15389b796c9ec79',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (data.success) {
        const newPatientInfo = { ...patientInfo, [type]: data.data.url };
        setPatientInfo(newPatientInfo);
        onPatientInfoChange(newPatientInfo);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setIsUploading(false);
      setUploadingType(null);
    }
  };

  const removePhoto = (type) => {
    const newPatientInfo = { ...patientInfo, [type]: '' };
    setPatientInfo(newPatientInfo);
    onPatientInfoChange(newPatientInfo);
  };

  return (
    <div>
      <p className='text-md mt-2 ml-2 font-bold'>TIBBİ TAHLİLLER İSTEM FORMU</p>
      <div className='rounded-lg bg-white px-2 pb-1'>
        <div className='flex items-center justify-between gap-1'>
          <div className='w-[30%]'>
            <input
              type='text'
              name='name'
              value={patientInfo.name}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[8px] md:text-sm'
              placeholder='Ad Soyad'
              required
            />
          </div>
          <div className='w-[15%]'>
            <input
              type='text'
              name='birthDate'
              value={patientInfo.birthDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-1 py-1 text-[8px] md:text-xs'
              placeholder='Doğum Tarihi'
            />
          </div>
          <div className='w-[15%]'>
            <input
              type='date'
              name='requestDate'
              value={patientInfo.requestDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-1 py-1 text-[8px] md:text-xs'
            />
          </div>
          <div className='w-[15%]'>
            <input
              type='text'
              name='tcNo'
              value={patientInfo.tcNo}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-1 py-1 text-[8px] md:text-xs'
              placeholder='T.C. Kimlik No'
            />
          </div>
          <div className='w-[10%]'>
            <select
              name='gender'
              value={patientInfo.gender}
              onChange={handleChange}
              className='w-full appearance-none rounded border border-gray-300 px-0.5 py-1 text-center text-[8px] md:text-xs'
            >
              <option value=''>Seç</option>
              <option value='erkek'>E</option>
              <option value='kadın'>K</option>
            </select>
          </div>
          <div className='flex w-[15%] items-center justify-center gap-1'>
            {/* Evrak Yükle */}
            <div className='relative'>
              <input
                type='file'
                accept='image/*'
                onChange={(e) => handlePhotoUpload(e, 'photo')}
                className='hidden'
                id='photo-upload'
                disabled={isUploading}
              />
              <label
                htmlFor='photo-upload'
                className={`inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-0.5 py-1 text-center text-[7px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none md:text-xs ${
                  isUploading && uploadingType === 'photo' ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                {isUploading && uploadingType === 'photo' ? 'Yükleniyor...' : 'Evrak Yükle'}
              </label>
              {patientInfo.photo && (
                <div className='relative h-6 w-8'>
                  <img
                    src={patientInfo.photo}
                    alt='Kimlik fotoğrafı'
                    className='h-6 w-8 rounded-lg object-contain'
                  />
                  <button
                    onClick={() => removePhoto('photo')}
                    className='absolute top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600'
                  >
                    <svg className='h-2 w-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className='absolute top-2 right-2 rounded-sm bg-blue-600 p-1 text-[7px] font-medium text-white hover:bg-blue-700 md:rounded-lg md:py-2 md:text-sm'
            >
              Paket Seç
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

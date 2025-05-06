import { useState } from 'react'

const Header = ({ onPatientInfoChange, initialValues = {} }) => {
  const [patientInfo, setPatientInfo] = useState({
    name: initialValues.name || '',
    birthDate: initialValues.birthDate || '',
    requestDate: initialValues.requestDate || '',
    tcNo: initialValues.tcNo || '',
    gender: initialValues.gender || '',
    photo: initialValues.photo || '',
    extraPhoto: initialValues.extraPhoto || ''
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    const newPatientInfo = { ...patientInfo, [name]: value }
    setPatientInfo(newPatientInfo)
    onPatientInfoChange(newPatientInfo)
  }

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setIsUploading(true)
      setUploadingType(type)
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('https://api.imgbb.com/1/upload?key=48e17415bdf865ecc15389b796c9ec79', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        const newPatientInfo = { ...patientInfo, [type]: data.data.url }
        setPatientInfo(newPatientInfo)
        onPatientInfoChange(newPatientInfo)
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Fotoğraf yüklenirken bir hata oluştu')
    } finally {
      setIsUploading(false)
      setUploadingType(null)
    }
  }

  const removePhoto = (type) => {
    const newPatientInfo = { ...patientInfo, [type]: '' }
    setPatientInfo(newPatientInfo)
    onPatientInfoChange(newPatientInfo)
  }

  return (
    <div>
      <p className='ml-2 text-lg mt-2 font-bold'>TIBBİ TAHLİLLER İSTEM FORMU</p>
      <div className='rounded-lg bg-white px-2 pb-1'>
        <div className='flex items-center justify-between gap-0.5'>
          <div className='w-full'>
            <input
              type='text'
              name='name'
              value={patientInfo.name}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
              placeholder='Ad Soyad'
              required
            />
          </div>
          <div className='w-full'>
            <input
              type='text'
              name='birthDate'
              value={patientInfo.birthDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
              placeholder='Doğum Tarihi'
            />
          </div>
          <div className='w-full'>
            <input
              type='date'
              name='requestDate'
              value={patientInfo.requestDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
            />
          </div>
          <div className='w-full'>
            <input
              type='text'
              name='tcNo'
              value={patientInfo.tcNo}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
              placeholder='T.C. Kimlik No'
            />
          </div>
          <div className='w-full'>
            <select
              name='gender'
              value={patientInfo.gender}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-1 py-1 text-[7px] md:text-xs'
            >
              <option value=''>Seç</option>
              <option value='erkek'>E</option>
              <option value='kadın'>K</option>
            </select>
          </div>
        </div>

        <div className='flex items-center gap-4 mt-2'>
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
              className={`inline-flex p-1 items-center border border-gray-300 rounded-md shadow-sm text-[7px] md:text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                isUploading && uploadingType === 'photo' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading && uploadingType === 'photo' ? 'Yükleniyor...' : 'Evrak Yükle'}
            </label>
            {patientInfo.photo && (
              <div className='relative w-10 h-8'>
                <img
                  src={patientInfo.photo}
                  alt='Kimlik fotoğrafı'
                  className='w-10 h-8 object-contain rounded-lg'
                />
                <button
                  onClick={() => removePhoto('photo')}
                  className='absolute top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
                >
                  <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Ek Fotoğraf */}
          <div className='relative'>
            <input
              type='file'
              accept='image/*'
              onChange={(e) => handlePhotoUpload(e, 'extraPhoto')}
              className='hidden'
              id='extra-photo-upload'
              disabled={isUploading}
            />
            <label
              htmlFor='extra-photo-upload'
              className={`inline-flex p-1 items-center border border-gray-300 rounded-md shadow-sm text-[7px] md:text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                isUploading && uploadingType === 'extraPhoto' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading && uploadingType === 'extraPhoto' ? 'Yükleniyor...' : 'Ek Fotoğraf'}
            </label>
            {patientInfo.extraPhoto && (
              <div className='relative w-10 h-8'>
                <img
                  src={patientInfo.extraPhoto}
                  alt='Ek fotoğraf'
                  className='w-10 h-8 object-contain rounded-lg'
                />
                <button
                  onClick={() => removePhoto('extraPhoto')}
                  className='absolute top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
                >
                  <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header
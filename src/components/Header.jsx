import { useState } from 'react'

const Header = ({ onPatientInfoChange, initialValues = {} }) => {
  const [patientInfo, setPatientInfo] = useState({
    name: initialValues.name || '',
    birthDate: initialValues.birthDate || '',
    requestDate: initialValues.requestDate || '',
    tcNo: initialValues.tcNo || '',
    gender: initialValues.gender || '',

  })

  const handleChange = (e) => {
    const { name, value } = e.target
    const newPatientInfo = { ...patientInfo, [name]: value }
    setPatientInfo(newPatientInfo)
    onPatientInfoChange(newPatientInfo)
  }

  return (
    <div className='space-y-2'>
      <div className='rounded-lg bg-white p-2 shadow'>
        <div className='gap-2 flex items-center justify-between'>
          <div className='w-full'>
            <label className='mb-1 block text-[7px] font-medium text-gray-700 md:text-xs'>
              Ad Soyad
            </label>
            <input
              type='text'
              name='name'
              value={patientInfo.name}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
              placeholder='Ad Soyad'
            />
          </div>
          <div className='w-full'>
            <label className='mb-1 block text-[7px] font-medium text-gray-700 md:text-xs'>
              Doğum Tarihi
            </label>
            <input
              type='date'
              name='birthDate'
              value={patientInfo.birthDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
            />
          </div>
          <div className='w-full'>
            <label className='mb-1 block text-[7px] font-medium text-gray-700 md:text-xs'>
              İstek Tarihi
            </label>
            <input
              type='date'
              name='requestDate'
              value={patientInfo.requestDate}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
            />
          </div>
          <div className='w-full'>
            <label className='mb-1 block text-[7px] font-medium text-gray-700 md:text-xs'>
              T.C. Kimlik No
            </label>
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
            <label className='mb-1 block text-[7px] font-medium text-gray-700 md:text-xs'>
              Cinsiyet
            </label>
            <select
              name='gender'
              value={patientInfo.gender}
              onChange={handleChange}
              className='w-full rounded border border-gray-300 px-2 py-1 text-[7px] md:text-xs'
            >
              <option value=''>Seçiniz</option>
              <option value='Erkek'>Erkek</option>
              <option value='Kadın'>Kadın</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
"use client"

import CommonCalendar from '../../_components/calendar/CommonCalendar'
import Header from '@/app/(protected)/_components/Header'
import React from 'react'

const CommonPage = () => {
    return (
        <div className='bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 min-h-full pb-3'>
            <Header />
            <div className="bg-[#F5F5F8] mx-2 rounded-lg mb-3 py-2 px-2 shadow-md md:w-[80%] md:mx-auto">
                <p className='text-xl'>共通カレンダー</p>
                <CommonCalendar />
            </div>
        </div>
    )
}

export default CommonPage
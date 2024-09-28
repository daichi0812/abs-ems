"use client"

import CommonCalendar from '../../_components/calendar/CommonCalendar'
import Header from '@/app/(protected)/_components/Header'
import React from 'react'

const CommonPage = () => {
    return (
        <>
            <Header />
            <div className="bg-[#F5F5F8] mx-2 rounded-sm mb-2 py-2 px-2 shadow">
                <p className='text-xl'>共通予約カレンダー</p>
            </div>
            <CommonCalendar />
        </>
    )
}

export default CommonPage
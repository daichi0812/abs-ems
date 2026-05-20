"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState } from 'react'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';
import { Center, Spinner } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'

import { formatDate1, formatDate2 } from '@/lib/calendar-event-rendering'
import { useCalendarData } from './hooks/common/use-calendar-data'
import { useResponsiveView } from './hooks/common/use-responsive-view'
import { useEventNavigation } from './hooks/common/use-event-navigation'

export default function CommonCalendar() {
  const { allEvents, isFetching } = useCalendarData();
  const { isMobile, displayWeekly, displayMonthly, showWeekly, showMonthly } = useResponsiveView();
  const { navigateToDetail } = useEventNavigation(allEvents);

  // NOTE: The detail modal below (showDetailModal) is currently commented out in the JSX.
  // These state variables and handlers are kept for future re-enablement of the modal flow.
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [nameToShow, setNameToShow] = useState<string | null>(null);
  const [isRentingToShow, setIsRentingToShow] = useState<number | null>(null);
  const [startToShow, setStartToShow] = useState<string | null>(null)
  const [endToShow, setEndToShow] = useState<string | null>(null)
  const [idToShow, setIdToShow] = useState<number>(0)
  const [eqipNameToShow, setEqipNameToShow] = useState<string | null>(null)

  const handleDetailModal = (data: { event: { id: string } }) => {
    const event = allEvents.find(event => event.id === Number(data.event.id));
    if (event) {
      setNameToShow(event.name);
      setIsRentingToShow(event.isRenting);
      setStartToShow(formatDate1(event.start.toString()));
      setEndToShow(formatDate2(event.end.toString()));
      setIdToShow(event.list_id);
      setEqipNameToShow(event.title);
    }
    setShowDetailModal(true)
  }

  function handleCloseModal() {
    setShowDetailModal(false)
  }

  // カスタムイベントコンテンツ
  const renderEventContent = (eventInfo: any) => {
    return (
      <div style={{ padding: '10px', fontSize: '12px', backgroundColor: eventInfo.event.backgroundColor, color: eventInfo.event.textColor }}>
        <div><strong>{eventInfo.event.title}</strong></div>
        <div>{eventInfo.event.extendedProps.name}</div>
        <div>開始: {formatDate1(eventInfo.event.start)}</div>
        <div>終了: {formatDate2(eventInfo.event.end)}</div>
      </div>
    );
  };

  const StyleWrapper = styled.div`
    .fc {
      background-color: #f5f5f7;
    }

    /* 曜日のレイアウトを変更する */
    .fc .fc-col-header-cell {
      font-size: 0.75rem;
      font-weight: normal;
      color: #000;
      border: none;
    }

    /* カレンダーの枠線を変更する */
    .fc .fc-scrollgrid {
      border-width: 0;
    }

    .fc .fc-scrollgrid-section > * {
      border: none;
    }

    .fc .fc-scrollgrid-sync-table {
      border: 1px;
    }

    /* 日付のテキストを変更する */
    .fc .fc-daygrid-day-number {
      font-size: 0.75rem;
    }

    /* タイトルを変更する */
    .fc .fc-toolbar-title {
      font-size: 1.2rem;
      color: #000;
      padding-left: 1rem;
    }

    /* ボタンを変更する */
    .fc .fc-button {
      font-size: 0.8rem;
    }

    /* "イベント"に対するCSS */
    .fc-event {
      padding-left: 2px !important;
      border-radius: 7px;
      overflow: hidden; /* はみ出した文字を隠す */
      text-overflow: ellipsis; /* はみ出した場合に "..." を表示 */
      white-space: nowrap; /* テキストを1行に収める */
    }

    /* "イベント名"に対するCSS */
    .fc-event-title {
      padding-left: 2px;
      overflow: hidden; /* はみ出した文字を隠す */
      text-overflow: ellipsis; /* はみ出した場合に "..." を表示 */
      white-space: nowrap; /* テキストを1行に収める */
    }

    /* 週表示に対するCSS */
    .fc-timegrid-event {
      height: auto !important;
      overflow: hidden; /* はみ出した文字を隠す */
      text-overflow: ellipsis; /* はみ出した場合に "..." を表示 */
      white-space: nowrap; /* テキストを1行に収める */
    }
  `

  return (
    <>
      {isFetching ? (
        <Center my={4}>
          <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
        </Center>
      ) : (
        <>
          {displayMonthly && (
            <>
              <div style={{ position: "relative", zIndex: "0" }}>
                <div className='flex mb-2'>
                  <p className='text-xl ml-1'>共通カレンダー</p>
                  <Button
                    className='items-center justify-center ml-auto text-white bg-[#2C3E50] hover:text-white hover:bg-slate-800'
                    variant={'outline'}
                    onClick={showWeekly}
                  >
                    週表示
                  </Button>
                </div>
                <StyleWrapper>
                  <FullCalendar
                    plugins={[
                      dayGridPlugin,
                      interactionPlugin,
                      timeGridPlugin
                    ]}
                    height="auto"
                    events={allEvents.map(event => ({
                      ...event,
                      textColor: event.textColor
                    })) as EventSourceInput}
                    nowIndicator={true}
                    droppable={true}
                    selectMirror={true}
                    eventClick={(data) => navigateToDetail(data)}
                    displayEventTime={false}
                    headerToolbar={{
                      left: 'title',
                      center: '',
                      right: 'prev,next'
                    }}
                    locales={[jaLocale]}
                    locale='ja'
                    titleFormat={{ year: 'numeric', month: 'short' }}
                  />
                </StyleWrapper>
              </div >


              {/* <DetailModal
                isOpen={showDetailModal}
                onClose={handleCloseModal}
                eqipName={eqipNameToShow}
                userName={nameToShow}
                rentingStatus={isRentingToShow}
                startDate={startToShow}
                endDate={endToShow}
                listId={idToShow}
              /> */}
            </>
          )}
          {displayWeekly && (
            <>
              <div style={{ position: "relative", zIndex: "0" }}>
                <div className='flex mb-2'>
                  <p className='text-xl ml-1'>共通カレンダー</p>
                  <Button
                    className='items-center justify-center ml-auto text-white bg-[#2C3E50] hover:text-white hover:bg-slate-800'
                    variant={'outline'}
                    onClick={showMonthly}
                  >
                    月表示
                  </Button>
                </div>
                <StyleWrapper>
                  <FullCalendar
                    plugins={[timeGridPlugin]}
                    height="auto"
                    events={allEvents.map(event => ({
                      ...event,
                      textColor: event.textColor
                    })) as EventSourceInput}
                    nowIndicator={true}
                    droppable={true}
                    selectMirror={true}
                    eventClick={(data) => navigateToDetail(data)}
                    eventContent={renderEventContent} // カスタムレンダリングを設定
                    locales={[jaLocale]}
                    locale='ja'
                    initialView={isMobile ? "timeGridThreeDay" : "timeGridWeek"} // モバイルかどうかで初期ビューを切り替え
                    views={{
                      timeGridThreeDay: {
                        type: "timeGrid",
                        duration: { days: 3 }, // 3日間表示
                        buttonText: "3日間",
                      },
                      timeGridWeek: {
                        type: "timeGrid",
                        duration: { days: 7 }, // 1週間表示
                        buttonText: "週",
                      },
                    }}
                    headerToolbar={{
                      left: 'title',
                      center: '',
                      right: 'prev,next'
                    }}
                    titleFormat={{ year: 'numeric', month: 'short', day: 'numeric' }}
                  />
                </StyleWrapper>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

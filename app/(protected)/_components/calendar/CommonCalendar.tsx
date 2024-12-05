"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect, useState } from 'react'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';
import { Center, Spinner } from '@chakra-ui/react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import axios from 'axios'

function formatDate1(date: Date | string): string {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${month}月${day}日`;
}

function formatDate2(date: Date | string): string {
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate() - 1}`.padStart(2, '0');
  return `${month}月${day}日`;
}

interface Event {
  textColor: string
  isRenting: number;
  name: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  id: number;
  list_id: number;
}

interface Users {
  name: string;
  user_id: string;
}

type Reserves = {
  id: number;
  user_id: string;
  start: string;
  end: string;
  list_id: number;
  isRenting: number;
};

type Lists = {
  tag: { name: string, color: string },
  id: number,
  name: string,
  detail: string,
  image: string,
  usable: boolean,
  color: string,
}

export default function CommonCalendar() {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [nameToShow, setNameToShow] = useState<string | null>(null);
  const [isRentingToShow, setIsRentingToShow] = useState<number | null>(null);
  const [startToShow, setStartToShow] = useState<string | null>(null)
  const [endToShow, setEndToShow] = useState<string | null>(null)
  const [idToShow, setIdToShow] = useState<number>(0)
  const [eqipNameToShow, setEqipNameToShow] = useState<string | null>(null)
  const [displayWeekly, setDisplayWeekly] = useState(false);
  const [displayMonthly, setDisplayMonthly] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 初期ロード時に画面幅でモバイル判定
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // 幅768px以下ならモバイル
    };

    handleResize();
    window.addEventListener("resize", handleResize); // リサイズ時に判定更新
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchReservesData = async () => {
    // ユーザーリストを取得
    const responseLists1 = await fetch('https://logicode.fly.dev/users');
    const reservesListsData1: Users[] = await responseLists1.json();

    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap1: { [key: string]: string } = reservesListsData1.reduce((map, item) => {
      map[item.user_id] = item.name;
      return map;
    }, {} as { [key: string]: string });

    // 機材データを取得
    const responseLists2 = await fetch('/api/lists');
    const reservesListsData2: Lists[] = await responseLists2.json();

    // IDをキーにして機材名と色をマッピング
    const idToNameMap2: { [key: string]: string } = {};
    const idToColorMap: { [key: string]: string } = {};

    reservesListsData2.forEach(item => {
      idToNameMap2[item.id] = item.name;
      idToColorMap[item.id] = item.tag?.color || '#3788D8';
    });

    // 予約データを取得
    const response = await fetch('/api/reserves');
    const reservesData: Reserves[] = await response.json();

    // 新しいイベントの一時配列を作成
    const newEvents = reservesData.map(item => {
      const endDate = new Date(item.end);
      endDate.setDate(endDate.getDate() + 1);

      const backgroundColor = idToColorMap[item.list_id] || '#3788D8';
      const textColor = getTextColorForBackground(backgroundColor);

      return {
        title: idToNameMap2[item.list_id],
        start: item.start,
        end: endDate,
        allDay: true,
        id: item.id,
        name: idToNameMap1[item.user_id],
        isRenting: item.isRenting,
        list_id: item.list_id,
        backgroundColor,
        borderColor: backgroundColor,
        textColor
      };
    });

    setAllEvents(newEvents);
    setIsFetching(false);
  };

  // イベントの背景の明るさを計算する関数
  function getTextColorForBackground(bgColor: string): string {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128 ? '#ffffff' : '#000000';
  }

  useEffect(() => {
    let draggableEl = document.getElementById('draggable-el')
    if (draggableEl) {
      new Draggable(draggableEl, {
        itemSelector: ".fc-event",
        eventData: function (eventEl) {
          let title = eventEl.getAttribute("title")
          let id = eventEl.getAttribute("data")
          let start = eventEl.getAttribute("start")
          return { title, id, start }
        }
      })
    }
    fetchReservesData()
  }, [])

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

  // イベントをクリックした時の処理
  const handleDetailInfo = (data: { event: { id: string } }) => {
    const event = allEvents.find(event => event.id === Number(data.event.id));
    router.push(`/ems/reserve/${event?.list_id}`)
  }

  // 週表示ボタンを押した時の処理
  const handleDisplayWeekly = () => {
    setDisplayMonthly(false);
    setDisplayWeekly(true);
  }

  // 月表示ボタンを押した時の処理
  const handleDisplayMonthly = () => {
    setDisplayWeekly(false);
    setDisplayMonthly(true);
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
                    onClick={handleDisplayWeekly}
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
                    eventClick={(data) => handleDetailInfo(data)}
                    displayEventTime={false}
                    headerToolbar={{
                      left: '',
                      center: 'title',
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
                    onClick={handleDisplayMonthly}
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
                    eventClick={(data) => handleDetailInfo(data)}
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
                      left: '',
                      center: 'title',
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
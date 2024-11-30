"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable, DropArg } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';
import { Center, Spinner, useBreakpointValue } from '@chakra-ui/react'

function formatDate1(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0'); // Convert month to 2 digits
  const day = `${d.getDate()}`.padStart(2, '0'); // Convert day to 2 digits
  return `${month}月${day}日`;
}

function formatDate2(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0'); // Convert month to 2 digits
  const day = `${d.getDate() - 1}`.padStart(2, '0'); // Convert day to 2 digits
  return `${month}月${day}日`;
}

interface Event {
  textColor: string
  isRenting: number;
  name: string;
  title: string;
  start: Date | string;
  end: Date | string; // Added end date
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
  start: string;  // Use string if API returns date in string format
  end: string;    // Use string if API returns date in string format
  list_id: number;
  isRenting: number;
};

type Lists = {
  tag: {name: string, color: string},
  id: number,
  name: string,
  detail: string,
  image: string,
  usable: boolean,
  color: string,
}


export default function CommonCalendar() {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [idToDelete, setIdToDelete] = useState<number | null>(null)
  const [nameToShow, setNameToShow] = useState<string | null>(null);
  const [isRentingToShow, setIsRentingToShow] = useState<number | null>(null);
  const [startToShow, setStartToShow] = useState<string | null>(null)
  const [endToShow, setEndToShow] = useState<string | null>(null)
  const [idToShow, setIdToShow] = useState<number>(0)
  const [eqipNameToShow, setEqipNameToShow] = useState<string | null>(null)

  const [filteredData, setFilteredData] = useState<Reserves[]>([])

  const [equipmentState, setEquipmentState] = useState(false);

  const [isFetching, setIsFetching] = useState(true);

  const fetchReservesData = async () => {
    // ユーザーリストを取得
    const responseLists1 = await fetch('https://logicode.fly.dev/users');
    const reservesListsData1: Users[] = await responseLists1.json();

    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap1: { [key: string]: string } = reservesListsData1.reduce((map, item) => {
      map[item.user_id] = item.name; // idをキーにして名前をマッピング
      return map;
    }, {} as { [key: string]: string });

    // 機材データを取得
    const responseLists2 = await fetch('https://logicode.fly.dev/lists');
    const reservesListsData2: Lists[] = await responseLists2.json();

    // IDをキーにして機材名と色をマッピング
    const idToNameMap2: { [key: string]: string } = {};
    const idToColorMap: { [key: string]: string } = {};
  
    reservesListsData2.forEach(item => {
      idToNameMap2[item.id] = item.name;
      idToColorMap[item.id] = item.tag?.color || '#3788D8'; // デフォルトの色を設定
    });

    // 予約データを取得
    const response = await fetch('https://logicode.fly.dev/reserves');
    const reservesData: Reserves[] = await response.json();

    // 新しいイベントの一時配列を作成
    const newEvents = reservesData.map(item => {
      const endDate = new Date(item.end);
      endDate.setDate(endDate.getDate() + 1); // 1日プラス

      // 色の条件を指定
      const backgroundColor = idToColorMap[item.list_id] || '#3788D8'; // デフォルト色を使用

      // 文字色を計算
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
        backgroundColor, // 背景色
        borderColor: backgroundColor, // 枠線の色
        textColor // 文字色
      };
    });

    // 全イベントを更新
    setAllEvents(newEvents);

    setIsFetching(false);

  };

  // イベントの背景の明るさを計算する関数
  function getTextColorForBackground(bgColor: string): string {
    // 背景色がHEXの場合を想定（例: #ff6666）
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 明るさを計算
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 明るさが128未満なら文字を白、それ以外は黒
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

  function handleDateClick(arg: { date: Date, allDay: boolean }) {
    // setNewEvent({ ...newEvent, start: arg.date, allDay: arg.allDay, id: new Date().getTime() })
    setShowModal(true)
  }

  function addEvent(data: DropArg) {
    // const event = { ...newEvent, start: data.date.toISOString(), title: data.draggedEl.innerText, allDay: data.allDay, id: new Date().getTime() }
    // setAllEvents([...allEvents, event])
  }

  function handleDeleteModal(data: { event: { id: string } }) {
    const event = allEvents.find(event => event.id === Number(data.event.id));
    if (event) {
      const userName = event.name; // Assuming title is the user's name
      setNameToShow(userName); // Set the user's name to display
      const isRenting = event.isRenting; // Assuming title is the user's name
      setIsRentingToShow(isRenting); // Set the user's name to display

      setStartToShow(formatDate1(event.start.toString()));
      setEndToShow(formatDate2(event.end.toString()));

      setIdToShow(event.list_id);

      setEqipNameToShow(event.title);
    }
    setShowDeleteModal(true)
    setIdToDelete(Number(data.event.id))
  }

  const getRentingStatusText = (isRentingToShow: number | null) => {
    switch (isRentingToShow) {
      case 0:
        return "予約";
      case 1:
        return "貸出期間（未貸出）";
      case 2:
        return "貸出期間";
      case 3:
        return "返却遅れ";
      case 4:
        return "返却完了";
    }
  };

  function handleDelete() {
    setAllEvents(allEvents.filter(event => Number(event.id) !== Number(idToDelete)))
    setShowDeleteModal(false)
    setIdToDelete(null)
  }

  function handleCloseModal() {
    setShowModal(false)
    // setNewEvent({
    //   title: userId,
    //   start: '',
    //   end: '',
    //   allDay: true,
    //   id: 0
    // })
    setShowDeleteModal(false)
    setIdToDelete(null)
  }

  const isMobile = useBreakpointValue({ base: 500, md: 720 })

  const isOverlapping = (newEvent: Event, filteredData: Reserves[]) => {
    const newEventStart = new Date(newEvent.start).getTime();
    const newEventEnd = new Date(newEvent.end).getTime();

    return filteredData.some(event => {
      const existingEventStart = new Date(event.start).getTime();
      const existingEventEnd = new Date(event.end).getTime();

      return (
        (newEventStart >= existingEventStart && newEventStart <= existingEventEnd) ||
        (newEventEnd >= existingEventStart && newEventEnd <= existingEventEnd) ||
        (newEventStart <= existingEventStart && newEventEnd >= existingEventEnd)
      );
    });
  };

  const StyleWrapper = styled.div`
    .fc {
      background-color: #f5f5f7;
    }

    /* 曜日のレイアウトを変更する */
    .fc .fc-col-header-cell {
      font-size: 0.75rem;
      font-weight: normal;
      color: #b6b5b3;
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
      font-size: 1.2rem; /* タイトルのフォントサイズ */
      color: #000; /* タイトルの色 */
      padding-left: 1rem;
    }

    /* ボタンを変更する */
    .fc .fc-button {
      font-size: 0.8rem; /* ボタンのフォントサイズ */
    }
    
    /* "イベント"に対するCSS */
    .fc-event {
      padding-left: 2px !important; /* 左側のパディングを追加 */
      border-radius: 7px; /* 角を少し丸くする */
    }

    /* "イベント名"に対するCSS */
    .fc-event-title {
      padding-left: 2px; /* イベント名の左側にパディングを追加 */
    }
  `

  return (
    <>
      {isFetching ? (
        <>
          <Center my={4}>
            <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" size="xl" />
          </Center>
        </>
      ) : (
        <>
          <div style={{ position: "relative", zIndex: "0" }}>
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
                  textColor: event.textColor // 文字色を追加
                })) as EventSourceInput}
                nowIndicator={true}
                droppable={true}
                selectMirror={true}
                dateClick={handleDateClick}
                drop={(data) => addEvent(data)}
                eventClick={(data) => handleDeleteModal(data)}
                displayEventTime={false}
                locales={[jaLocale]}
                locale='ja'
                titleFormat={{ year: 'numeric', month: 'short' }}
              />
            </StyleWrapper>
          </div >

          <Transition.Root show={showDeleteModal} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={setShowDeleteModal}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full justify-center p-4 text-center items-center sm:p-0">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg
                   bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                    >

                      <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                            <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                              予約の詳細
                            </Dialog.Title>
                            <div className="mt-2 flex flex-col text-left">
                              <p className="text-xl text-gray-500">
                                機材名: {eqipNameToShow}
                              </p>
                              <p className="text-xl text-gray-500">
                                予約者: {nameToShow}
                              </p>
                              <p className="text-xl text-gray-500">
                                状態: {getRentingStatusText(isRentingToShow)}
                              </p>
                              <p className="text-xl text-gray-500">
                                期間: {startToShow} ~ {endToShow}
                              </p>
                              <a
                                className="bg-white hover:bg-gray-100 text-center text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded inline-block shadow mt-4 mb-4"
                                href={"/ems/reserve/" + idToShow.toString()}
                              >
                                {eqipNameToShow}{" "}のページ
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 
                      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={handleCloseModal}
                        >
                          閉じる
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        </>
      )
      }
    </>
  )
}
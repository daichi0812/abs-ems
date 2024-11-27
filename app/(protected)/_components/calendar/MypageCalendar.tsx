"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable, DropArg } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { EventSourceInput } from '@fullcalendar/core/index.js'
import axios from 'axios'
import { useRouter } from 'next/navigation'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';
import { Box, Spinner } from '@chakra-ui/react'

interface Event {
  title: string;
  start: Date | string;
  end: Date | string;
  allDay: boolean;
  id: number;
}

type Reserves = {
  id: number,
  user_id: string,
  start: Date,
  end: Date,
  list_id: number,
  isRenting: number
}

type List = {
  id: number;
  name: string;
  tag: {
    color: string;
  };
};

type MypageCalendarProps = {
  filteredData: Reserves[],
  idToNameMap: { [key: number]: string };
  userId: string | undefined;
  mypageFetchReservesData: () => Promise<void>;
}

export default function MypageCalendar({ filteredData, idToNameMap, userId, mypageFetchReservesData }: MypageCalendarProps) {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [isFetching, setIsFetching] = useState(true);
  const [listColorMap, setListColorMap] = useState<{ [key: number]: string }>({});
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [idToDelete, setIdToDelete] = useState<number | null>(null)
  const [newEvent, setNewEvent] = useState<Event>({
    title: "",
    start: '',
    end: '', // Added end date
    allDay: false,
    id: 0
  })


  const router = useRouter()  // Initialize useRouter

  // リストデータを取得して色をマッピング
  useEffect(() => {
    const fetchListData = async () => {
      try {
        const response = await fetch('https://logicode.fly.dev/lists');
        const listData: List[] = await response.json();
        const colorMap: { [key: number]: string } = {};
        listData.forEach((list) => {
          colorMap[list.id] = list.tag?.color || '#3788D8'; // デフォルト色を設定
        });
        setListColorMap(colorMap);
      } catch (error) {
        console.error('Error fetching list data:', error);
      }
    };

    fetchListData();
  }, []);

  // 予約データからイベントを作成
  useEffect(() => {
    const createEvents = () => {
      // 新しいイベントを作成
      const newEvents = filteredData.map((item) => {
        const endDate = new Date(item.end);
        endDate.setDate(endDate.getDate() + 1); // 一日追加

        // 色の条件を指定
        const backgroundColor = listColorMap[item.list_id] || "#3788D8"; // マップから色を取得
        const textColor = getTextColorForBackground(backgroundColor);

        return {
          title: idToNameMap[item.list_id],
          start: item.start,
          end: endDate,
          allDay: true,
          id: item.id,
          backgroundColor,
          borderColor: backgroundColor,
          textColor,
        }
      })

      setAllEvents(newEvents);
      setIsFetching(false);
    }

    if(Object.keys(listColorMap).length > 0){
      createEvents();
    }
  },[filteredData, idToNameMap, listColorMap]);

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
  }, [filteredData])

  function handleDateClick(arg: { date: Date, allDay: boolean }) {
    setNewEvent({ ...newEvent, start: arg.date, allDay: arg.allDay, id: new Date().getTime() })
    setShowModal(true)
  }

  function addEvent(data: DropArg) {
    const event = { ...newEvent, start: data.date.toISOString(), title: data.draggedEl.innerText, allDay: data.allDay, id: new Date().getTime() }
    setAllEvents([...allEvents, event])
  }

  function handleDeleteModal(data: { event: { id: string } }) {
    // console.log("今イベントクリックしましたね");
    setShowDeleteModal(true)
    setIdToDelete(Number(data.event.id))
  }

  function handleDelete() {
    const eventToDelete = filteredData.find(event => Number(event.id) === Number(idToDelete));

    if (eventToDelete && (eventToDelete.isRenting === 2 || eventToDelete.isRenting === 3 || eventToDelete.isRenting === 4)) {
      if (eventToDelete.isRenting === 2) {
        window.alert('現在借りている機材は削除できません。');
      } else if (eventToDelete.isRenting === 3) {
        window.alert('現在借りている機材は削除できません。');
      } else {
        window.alert('過去の記録は消すことができません。');
      }
      setShowDeleteModal(false);
      setIdToDelete(null);
      return;
    }

    const deleteReservesData = async () => {
      const response = await axios.delete(`https://logicode.fly.dev/reserves/${Number(idToDelete)}`);

      await mypageFetchReservesData(); // マイページの予約の箱更新のための関数

      setAllEvents(allEvents.filter(event => Number(event.id) !== Number(idToDelete)));
      setShowDeleteModal(false);
      setIdToDelete(null);
    };

    deleteReservesData();
  }

  function handleCloseModal() {
    setShowModal(false)
    setNewEvent({
      title: '',
      start: '',
      end: '',
      allDay: false,
      id: 0
    })
    setShowDeleteModal(false)
    setIdToDelete(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewEvent({
      ...newEvent,
      title: e.target.value
    })
  }

  const StyleWrapper = styled.div`
    .fc {
      background-color: #f5f5f7;
      padding: 0.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAllEvents([...allEvents, newEvent])
    setShowModal(false)
    setNewEvent({
      title: '',
      start: '',
      end: '',
      allDay: false,
      id: 0
    })
  }

  return (
    <>
      {isFetching ? (
        <Box
          position="relative"
          height="500px"
          bg="#f5f5f7"
          p="0.5rem"
          borderRadius="0.5rem"
          boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)">
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
          >
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="blue.500"
              size="xl"
            />
          </Box>
        </Box>
      ) : (
        <div>
          <StyleWrapper>
            <FullCalendar
              plugins={
                [
                  dayGridPlugin,
                  interactionPlugin,
                  timeGridPlugin
                ]
              }
              height={500}
              events={allEvents as EventSourceInput}
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
          </StyleWrapper >

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
                          <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center 
                      justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                          </div>
                          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                              予約のキャンセル
                            </Dialog.Title>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                キャンセルするともとには戻せません
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button type="button" className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm 
                      font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto" onClick={handleDelete}>
                          Delete
                        </button>
                        <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 
                      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={handleCloseModal}
                        >
                          Cancel
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        </div >
      )

      }
    </>
  )
}
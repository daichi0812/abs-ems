"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable, DropArg } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';

import axios from 'axios'
import moment from 'moment-timezone';
import { Box, Spinner } from '@chakra-ui/react'

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0'); // Convert month to 2 digits
  const day = `${d.getDate()}`.padStart(2, '0'); // Convert day to 2 digits
  return `${year}-${month}-${day}`;
}

interface Event {
  title: string | undefined;
  start: Date | string;
  end: Date | string; // Added end date
  allDay: boolean;
  id: number;
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
};

type Props = {
  userId: string | undefined;
  listId: number;
}

export default function ReservationCalendar({ userId, listId }: Props) {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [idToDelete, setIdToDelete] = useState<number | null>(null)
  const [newEvent, setNewEvent] = useState<Event>({
    title: userId,
    start: '',
    end: '', // Added end date
    allDay: true,
    id: 0
  })

  const [filteredData, setFilteredData] = useState<Reserves[]>([])

  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    setNewEvent({
      title: userId,
      start: '',
      end: '',
      allDay: false,
      id: 0
    })
  }, [userId])

  const postReservesData = async () => {
    const startDate = new Date(newEvent.start);
    startDate.setDate(startDate.getDate() + 1); // 1日プラス

    const response = await axios.post('/api/reserves', {
      user_id: userId,
      start: startDate,
      end: newEvent.end,
      list_id: listId
    });
  };

  const fetchReservesData = async () => {
    // ユーザーリストを取得
    const responseLists = await fetch('https://logicode.fly.dev/users');
    const reservesListsData: Users[] = await responseLists.json();

    // ユーザーIDをキーにして名前をマッピング
    const idToNameMap: { [key: string]: string } = reservesListsData.reduce((map, item) => {
      map[item.user_id] = item.name; // idをキーにして名前をマッピング
      return map;
    }, {} as { [key: string]: string });


    const response = await fetch('/api/reserves');
    const reservesData: Reserves[] = await response.json();
    const filteredData = reservesData.filter((item: Reserves) => item.list_id == listId);

    setFilteredData(filteredData);
    // 新しいイベントの一時配列を作成
    const newEvents = filteredData.map(item => {
      const endDate = new Date(item.end);
      endDate.setDate(endDate.getDate() + 1); // 1日プラス

      return {
        title: idToNameMap[item.user_id],
        start: item.start,
        end: endDate,
        allDay: true,
        id: item.id
      };
    });

    // 全イベントを更新
    setAllEvents(newEvents);

    setIsFetching(false);
  };

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
    setNewEvent({ ...newEvent, start: arg.date, allDay: arg.allDay, id: new Date().getTime() })
    setShowModal(true)
  }

  function addEvent(data: DropArg) {
    const event = { ...newEvent, start: data.date.toISOString(), title: data.draggedEl.innerText, allDay: data.allDay, id: new Date().getTime() }
    setAllEvents([...allEvents, event])
  }

  function handleDeleteModal(data: { event: { id: string } }) {
    setShowDeleteModal(true)
    setIdToDelete(Number(data.event.id))
  }

  function handleDelete() {
    setAllEvents(allEvents.filter(event => Number(event.id) !== Number(idToDelete)))
    setShowDeleteModal(false)
    setIdToDelete(null)
  }

  function handleCloseModal() {
    setShowModal(false)
    setNewEvent({
      title: userId,
      start: '',
      end: '',
      allDay: true,
      id: 0
    })
    setShowDeleteModal(false)
    setIdToDelete(null)
  }

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
      border-radius: 0.375rem;
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

    if (newEvent.start === "" || newEvent.end === "") {
      window.alert('日付を選択してください。');
      return;
    }

    const hasOverlap = isOverlapping(newEvent, filteredData);

    if (hasOverlap) {
      window.alert('この期間にはすでに予約が入っています。別の期間を選択してください。');
      setShowModal(false);
      return;
    }

    const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
    const start = moment(newEvent.start).tz('Asia/Tokyo').format('YYYY-MM-DD');
    const end = moment(newEvent.end).tz('Asia/Tokyo').format('YYYY-MM-DD');

    if (start < today || end < today || end < start) {

      window.alert('無効な予約日です。');
      setShowModal(false);
      return;
    }

    setAllEvents(prevEvents => [...prevEvents, newEvent]);
    postReservesData(); // データをAPIに送信

    // 新しいイベントオブジェクトをリセット
    setNewEvent({
      title: userId, // 初期値に戻す
      start: '',
      end: '',
      allDay: true,
      id: 0
    });

    window.alert('予約が正常に完了しました。');
    fetchReservesData();
    setShowModal(false); // モーダルを閉じる
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
        <>
          <div style={{ position: "relative", zIndex: "0" }}>
            <StyleWrapper>
              <FullCalendar
                plugins={[
                  dayGridPlugin,
                  interactionPlugin,
                  timeGridPlugin
                ]}
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
            </StyleWrapper>
          </div >

          <Transition.Root show={showModal} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={setShowModal}>
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
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                      <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                          <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-center sm:mt-5">
                          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                            機材を借りる期間を選択してください
                          </Dialog.Title>
                          <form action="submit" onSubmit={handleSubmit}>
                            <div className="mt-2">
                              <input type="date" name="start" // Changed to datetime-local
                                value={formatDate(newEvent.start)}
                                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900"
                                placeholder="Start Date" />
                            </div>
                            <div className="mt-2">
                              <input type="date" name="end" // Added end date input
                                value={formatDate(newEvent.end)}
                                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900"
                                placeholder="End Date" />
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                              <button
                                type="submit"
                                className="inline-flex w-full justify-center rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:col-start-2 disabled:opacity-25"
                                disabled={newEvent.title === ''}
                              >
                                予約確定
                              </button>
                              <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                onClick={handleCloseModal}

                              >
                                戻る
                              </button>
                            </div>
                          </form>
                        </div>
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
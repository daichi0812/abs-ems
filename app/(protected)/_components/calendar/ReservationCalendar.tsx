"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Box, Spinner } from '@chakra-ui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import styled from 'styled-components';

import { useReservationData } from './hooks/reservation/use-reservation-data'
import { useReservationForm } from './hooks/reservation/use-reservation-form'
import { useReservationDeleteFlow } from './hooks/reservation/use-reservation-delete-flow'

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0'); // Convert month to 2 digits
  const day = `${d.getDate()}`.padStart(2, '0'); // Convert day to 2 digits
  return `${year}-${month}-${day}`;
}

type Props = {
  userId: string | undefined;
  listId: number;
}

export default function ReservationCalendar({ userId, listId }: Props) {
  const { allEvents, setAllEvents, filteredData, isFetching, refetch } = useReservationData({ listId });
  const form = useReservationForm({
    userId,
    listId,
    filteredData,
    allEvents,
    setAllEvents,
    refetchReserves: refetch,
  });
  const deleteFlow = useReservationDeleteFlow({ allEvents, setAllEvents });

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
  }, [])

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
                dateClick={form.handleDateClick}
                drop={(data) => form.addEvent(data)}
                eventClick={(data) => deleteFlow.openDelete(data)}
                displayEventTime={false}
                locales={[jaLocale]}
                locale='ja'
                titleFormat={{ year: 'numeric', month: 'short' }}
              />
            </StyleWrapper>
          </div >

          <Transition.Root show={form.showModal} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={form.setShowModal}>
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
                          <form action="submit" onSubmit={form.submit}>
                            <div className="mt-2">
                              <input type="date" name="start" // Changed to datetime-local
                                value={formatDate(form.newEvent.start)}
                                onChange={(e) => form.updateStart(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900"
                                placeholder="Start Date" />
                            </div>
                            <div className="mt-2">
                              <input type="date" name="end" // Added end date input
                                value={formatDate(form.newEvent.end)}
                                onChange={(e) => form.updateEnd(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900"
                                placeholder="End Date" />
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                              <button
                                type="submit"
                                className="inline-flex w-full justify-center rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:col-start-2 disabled:opacity-25"
                                disabled={form.newEvent.title === '' || form.isSubmitting}
                              >
                                {form.isSubmitting ? '予約中…' : '予約確定'}
                              </button>
                              <button
                                type="button"
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                                onClick={() => {
                                  form.closeModal();
                                  deleteFlow.closeDelete();
                                }}

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

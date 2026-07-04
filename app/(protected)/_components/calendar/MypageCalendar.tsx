"use client"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Fragment, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { EventSourceInput } from '@fullcalendar/core/index.js'

import jaLocale from '@fullcalendar/core/locales/ja';
import styled from 'styled-components';
import { Box, Spinner } from '@chakra-ui/react'

import { useListColorMap } from './hooks/mypage/use-list-color-map'
import { useCalendarEvents, type Reserve } from './hooks/mypage/use-calendar-events'
import { useDeleteFlow } from './hooks/mypage/use-delete-flow'
import { useNewEventForm } from './hooks/mypage/use-new-event-form'

type MypageCalendarProps = {
  filteredData: Reserve[],
  idToNameMap: { [key: number]: string };
  userId: string | undefined;
  mypageFetchReservesData: () => Promise<void>;
}

export default function MypageCalendar({ filteredData, idToNameMap, userId, mypageFetchReservesData }: MypageCalendarProps) {
  const { listColorMap } = useListColorMap();
  const { allEvents, setAllEvents, isFetching } = useCalendarEvents({
    filteredData,
    idToNameMap,
    listColorMap,
  });
  const deleteFlow = useDeleteFlow({
    filteredData,
    allEvents,
    setAllEvents,
    refetchReserves: mypageFetchReservesData,
  });
  const newEventForm = useNewEventForm({ allEvents, setAllEvents });

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
              dateClick={newEventForm.handleDateClick}
              drop={(data) => newEventForm.addEvent(data)}
              eventClick={(data) => deleteFlow.openDelete(data)}
              displayEventTime={false}
              locales={[jaLocale]}
              locale='ja'
              titleFormat={{ year: 'numeric', month: 'short' }}
            />
          </StyleWrapper >

          <Transition.Root show={deleteFlow.showDeleteModal} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={deleteFlow.setShowDeleteModal}>
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
                      font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto" onClick={deleteFlow.deleteSelected}>
                          Delete
                        </button>
                        <button type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900
                      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                          onClick={() => {
                            newEventForm.closeModal();
                            deleteFlow.closeDelete();
                          }}
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

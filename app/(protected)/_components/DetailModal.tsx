// DetailModal.tsx
"use client"

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eqipName: string | null;
  userName: string | null;
  rentingStatus: number | null;
  startDate: string | null;
  endDate: string | null;
  listId: number;
}

const getRentingStatusText = (status: number | null): string => {
  switch (status) {
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
    default:
      return "不明な状態";
  }
}

const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  eqipName,
  userName,
  rentingStatus,
  startDate,
  endDate,
  listId
}) => {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                          機材名: {eqipName}
                        </p>
                        <p className="text-xl text-gray-500">
                          予約者: {userName}
                        </p>
                        <p className="text-xl text-gray-500">
                          状態: {getRentingStatusText(rentingStatus)}
                        </p>
                        <p className="text-xl text-gray-500">
                          期間: {startDate} ~ {endDate}
                        </p>
                        {listId !== undefined && (
                          <a
                            className="bg-white hover:bg-gray-100 text-center text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded inline-block shadow mt-4 mb-4"
                            href={`/ems/reserve/${listId}`}
                          >
                            {eqipName} のページ
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button 
                    type="button" 
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 
                      shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
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
  )
}

export default DetailModal
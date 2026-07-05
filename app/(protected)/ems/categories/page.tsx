"use client"

import React from 'react';
import { Button, Center, Spinner, Input } from '@chakra-ui/react';
import { useTransition } from 'react';
import { useTagsList } from '../_hooks/use-tags-list';
import { useTagEditing } from './hooks/use-tag-editing';
import { useTagDeletion } from './hooks/use-tag-deletion';

const EditCategories = () => {
    const [isPending, startTransition] = useTransition();

    const { tags, isLoading, refetch } = useTagsList({ sortById: true });
    const editing = useTagEditing({ refetchTags: refetch });
    const { deleteTag } = useTagDeletion({ refetchTags: refetch });

    return (
        <div
            className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 h-full"
        >
            <div className="bg-[#F5F5F8] shadow rounded-md p-3 mt-3 mx-2 md:w-[80%] md:mx-auto">
                <p className="text-xl mb-1">カテゴリの編集</p>
                {!isLoading ? (
                    <>
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="bg-slate-200 rounded-md p-2 mt-3 flex shadow gap-x-1"
                            >
                                {editing.editTagId === tag.id ? (
                                    // 編集モード
                                    <div className='flex'>
                                        <div className='flex justify-center items-center me-1'>
                                            <input
                                                className='w-8 h-8 border rounded-md'
                                                type="color"
                                                onChange={(e) => editing.setEditTagColor(e.target.value)}
                                                value={editing.editTagColor} />
                                        </div>
                                        <Input
                                            ref={editing.inputRef}
                                            value={editing.editTagName}
                                            onChange={(e) => editing.setEditTagName(e.target.value)}
                                            placeholder="カテゴリ名を入力してください"
                                            size="md"
                                            border="2px solid"
                                        />
                                    </div>
                                ) : (
                                    <div className='flex'>
                                        <div className="flex justify-center items-center">
                                            <div className="rounded-full flex h-5 w-5" style={{ backgroundColor: tag.color }}></div>
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <p className='rounded p-1'>{tag.name}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="ml-auto items-center flex gap-x-1">
                                    {editing.editTagId === tag.id ? (
                                        <>
                                            {isPending ? (
                                                <Button
                                                    isLoading
                                                    size={'md'}
                                                    ms={1}
                                                    colorScheme="blue"
                                                >
                                                    保存
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => editing.saveEdit(tag.id)}
                                                    size={'md'}
                                                    ms={1}
                                                    colorScheme="blue"
                                                >
                                                    保存
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={() => editing.startEdit(tag.id, tag.name, tag.color)}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                            <Button
                                                onClick={() => deleteTag(tag.id)}
                                                size={'md'}
                                                colorScheme="red"
                                            >
                                                削除
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <Center my={4}>
                        <Spinner
                            thickness="4px"
                            speed="0.65s"
                            emptyColor="gray.200"
                            color="blue.500"
                            size="xl"
                        />
                    </Center>
                )}
            </div>
        </div>
    );
};

export default EditCategories;

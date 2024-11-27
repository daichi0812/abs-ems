"use client"

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { Button, Center, Spinner, Input } from '@chakra-ui/react';
import Header from '@/app/(protected)/_components/Header';
import axios from 'axios';

interface Tags {
    id: number;
    name: string;
    color: string;
}

const EditCategories = () => {
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [tags, setTags] = useState<Tags[]>([]);
    const [editTagId, setEditTagId] = useState<number | null>(null); // 編集中のカテゴリID
    const [editTagName, setEditTagName] = useState<string>(''); // 編集中のカテゴリ名
    const [editTagColor, setEditTagColor] = useState<string>('');

    const inputRef = useRef<HTMLInputElement | null>(null);

    // カテゴリ一覧を取得
    const fetchTags = async () => {
        try {
            const response = await axios.get("https://logicode.fly.dev/tags");
            const sortedTags = response.data.sort((a: Tags, b: Tags) => a.id - b.id);
            setTags(sortedTags);
        } catch (err) {
            console.error("カテゴリ一覧の取得に失敗しました", err);
        } finally {
            setIsLoading(false);
        }
    };

    // カテゴリを編集
    const handleEditTag = async (id: number) => {
        if (!editTagName.trim()) {
            alert("カテゴリ名を入力してください.");
            return;
        }
        try {
            await axios.put(`https://logicode.fly.dev/tags/${id}`, {
                name: editTagName,
                color: editTagColor,
            });
            alert("カテゴリが更新されました.");
            setEditTagId(null); // 編集モードを終了
            fetchTags(); // 最新のカテゴリ一覧を取得
        } catch (err) {
            console.error("カテゴリの更新に失敗しました.", err);
            alert("カテゴリの更新に失敗しました.");
        }
    };

    // カテゴリを削除
    const handleDeleteTag = async (id: number) => {
        const confirmed = window.confirm(
            "機材に登録されたカテゴリが失われます.\n本当にこのカテゴリを削除しますか？"
        );
        if (confirmed) {
            try {
                await axios.delete(`https://logicode.fly.dev/tags/${id}`);
                alert("カテゴリが削除されました.");
                fetchTags(); // 最新のカテゴリ一覧を取得
            } catch (err) {
                console.error("カテゴリの削除に失敗しました.", err);
                alert("カテゴリの削除に失敗しました.");
            }
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        if (editTagId !== null) {
            inputRef.current?.focus();
        }
    }, [editTagId]);

    return (
        <div
            className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
            from-sky-400 to-blue-800 h-full"
        >
            <Header />
            <div className="bg-[#F5F5F8] shadow rounded-md p-3 mt-3 mx-2 md:w-[80%] md:mx-auto">
                <p className="text-xl mb-1">カテゴリの編集</p>
                {!isLoading ? (
                    <>
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="bg-slate-200 rounded-md p-2 mt-3 flex shadow gap-x-1"
                            >
                                {editTagId === tag.id ? (
                                    // 編集モード
                                    <div className='flex'>
                                        <div className='flex justify-center items-center'>
                                            <input
                                                className='w-8 h-8 border rounded-md'
                                                type="color"
                                                onChange={(e) => setEditTagColor(e.target.value)}
                                                value={editTagColor} />
                                        </div>
                                        <Input
                                            ref={inputRef}
                                            value={editTagName}
                                            onChange={(e) => setEditTagName(e.target.value)}
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
                                    {editTagId === tag.id ? (
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
                                                    onClick={() => handleEditTag(tag.id)}
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
                                                onClick={() => {
                                                    setEditTagId(tag.id); // 編集対象を設定
                                                    setEditTagName(tag.name); // 編集中のカテゴリ名を設定
                                                    setEditTagColor(tag.color); // 編集中のカテゴリ色を設定
                                                }}
                                                size={'md'}
                                                me={1}
                                                colorScheme="yellow"
                                            >
                                                編集
                                            </Button>
                                            <Button
                                                onClick={() => handleDeleteTag(tag.id)}
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

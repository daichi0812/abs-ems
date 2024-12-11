'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Header from '../../_components/Header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

const PayPalButton = () => {
  return (
    <form
      action="https://www.paypal.com/cgi-bin/webscr"
      method="post"
      target="_top"
      className="flex justify-center"
    >
      <input type="hidden" name="cmd" value="_s-xclick" />
      <input type="hidden" name="hosted_button_id" value="KCFL8BAA8GXL6" />
      <input type="hidden" name="currency_code" value="JPY" />

      <Button
        type="submit"
        title="PayPalで安全にお支払いが可能です。"
        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
      >
        <Image
          src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
          width={24}
          height={24}
          alt="PayPal"
        />
        <span>今すぐ購入</span>
      </Button>
    </form>
  );
};

const StorePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-indigo-800 flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-white shadow-xl rounded-lg overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">
              ABS機材管理システム
            </CardTitle>
            <CardDescription className="text-gray-500">
              機材の予約・管理を効率的に行うためのソリューション
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-6">
              <Image
                src="/logicode.jpeg"
                alt="企業ロゴ"
                width={120}
                height={120}
                className="rounded-full"
              />
            </div>
            <a
              href="/meisai.xlsx"
              download
              className="text-center text-2xl font-semibold text-blue-500 hover:text-blue-600 mb-4"
            >
              明細書はこちら
            </a>
            <p className="text-center text-gray-600 mt-3 mb-6">
              Logicodeが提供するABS機材管理システムは、放送部の機材管理をシンプルかつ効率的にサポートします。
            </p>
            <p className="text-center text-gray-600">
              お問い合わせは{' '}
              <a
                href="mailto:a5822125@aoyama.jp"
                className="text-blue-600 underline"
              >
                a5822125@aoyama.jp
              </a>{' '}
              まで
            </p>
          </CardContent>
          <CardFooter className="flex justify-center mt-6">
            <PayPalButton />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default StorePage;
// 予約ウィザードのパネル間で共有する表示用の型。
export interface PickItem {
  id: number;
  name: string;
  detail: string;
  free: boolean;
  sub: string; // 「この期間は空いています」/「M/D〜M/D ○○が予約」
  selected: boolean;
}

export interface PickGroup {
  catId: string;
  catName: string;
  color: string;
  iconPath: string;
  items: PickItem[];
}

export interface CartItem {
  id: number;
  name: string;
  color: string;
  iconPath: string;
}

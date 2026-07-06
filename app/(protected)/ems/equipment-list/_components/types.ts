// 予約ウィザードのパネル間で共有する表示用の型。
export interface PickItem {
  id: number;
  name: string;
  detail: string;
  image: string; // 機材写真のURL。空ならカテゴリアイコンで代替
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
  image: string; // 機材写真のURL。空ならカテゴリアイコンで代替
  color: string;
  iconPath: string;
}

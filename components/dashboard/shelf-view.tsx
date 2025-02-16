"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Package, ArrowRight, ArrowDownRight } from "lucide-react";
import { useProductStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ShelfView() {
  const { products, updateProduct, addHistory, shelfConfigs } = useProductStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    column: string;
    position: number;
    level: number;
  } | null>(null);
  const [isOutboundDialogOpen, setIsOutboundDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    code: string;
    name: string;
    cases: number;
    quantity: number;
  } | null>(null);
  const [outboundCases, setOutboundCases] = useState<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 検索結果の取得
  const searchResults = searchTerm ? products.filter(product =>
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // 商品の保管場所を取得
  const getProductLocations = (product: typeof products[0]) => {
    return product.locations.map(loc => ({
      column: loc.column,
      position: parseInt(loc.position),
      level: parseInt(loc.level),
      cases: loc.cases
    }));
  };

  // 特定の場所にスクロール
  const scrollToLocation = (column: string, position: number, level: number) => {
    const content = contentRef.current;
    if (!content) return;

    // 該当の列を特定
    const columns = getColumns();
    const columnIndex = columns.indexOf(column);
    if (columnIndex === -1) return;

    // スクロール位置の計算
    const columnWidth = 136; // 列の幅 (32px) + ギャップ (8px)
    const horizontalScroll = columnIndex * columnWidth;

    const rowHeight = 56; // 行の高さ (48px) + ギャップ (8px)
    const verticalScroll = (position - 1) * rowHeight;

    // スクロール実行
    content.scrollTo({
      left: horizontalScroll,
      top: verticalScroll,
      behavior: 'smooth'
    });

    // 場所を選択状態に
    setSelectedLocation({ column, position, level });
  };

  // 水平・垂直スクロール同期
  useEffect(() => {
    const content = contentRef.current;
    const header = headerRef.current;
    const sidebar = sidebarRef.current;

    if (!content || !header || !sidebar) return;

    const handleScroll = () => {
      header.scrollLeft = content.scrollLeft;
      sidebar.scrollTop = content.scrollTop;
    };

    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, []);

  // 列を取得（設定に基づく）
  const getColumns = () => Object.keys(shelfConfigs).sort();

  // 特定の場所の在庫情報を取得（レベル4以上をレベル3に合算）
  const getLocationStock = (column: string, position: number, level: number) => {
    const stockItems = products.filter(product =>
      product.locations.some(loc => {
        const locLevel = parseInt(loc.level);
        return loc.column === column &&
               parseInt(loc.position) === position &&
               ((level === 3 && locLevel >= 3) || // レベル3の場合は3以上を全て含める
                (level < 3 && locLevel === level)); // レベル1,2の場合は完全一致
      })
    );

    return stockItems.map(product => {
      const locations = product.locations.filter(loc => {
        const locLevel = parseInt(loc.level);
        return loc.column === column &&
               parseInt(loc.position) === position &&
               ((level === 3 && locLevel >= 3) || // レベル3の場合は3以上を全て含める
                (level < 3 && locLevel === level)); // レベル1,2の場合は完全一致
      });

      const totalCases = locations.reduce((sum, loc) => sum + loc.cases, 0);
      return {
        code: product.code,
        name: product.name,
        cases: totalCases,
        quantity: totalCases * product.quantityPerCase
      };
    });
  };

  // 場所の状態を判定（空き・通常・満杯）
  const getLocationStatus = (items: Array<{ cases: number }>) => {
    if (items.length === 0) return "empty";
    const totalCases = items.reduce((sum, item) => sum + item.cases, 0);
    return totalCases >= 30 ? "full" : "normal";
  };

  // 検索条件に合致する商品がある場所をハイライト
  const shouldHighlight = (column: string, position: number, level: number) => {
    if (!searchTerm) return false;
    
    return products.some(product => 
      (product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
       product.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      product.locations.some(loc => {
        const locLevel = parseInt(loc.level);
        return loc.column === column &&
               parseInt(loc.position) === position &&
               ((level === 3 && locLevel >= 3) ||
                (level < 3 && locLevel === level));
      })
    );
  };

  // 出荷処理の実行
  const handleOutbound = () => {
    if (!selectedLocation || !selectedProduct) return;

    const product = products.find(p => p.code === selectedProduct.code);
    if (!product) {
      toast({
        title: "エラー",
        description: "商品が見つかりません。",
        variant: "destructive",
      });
      return;
    }

    // 出荷数量のバリデーション
    if (outboundCases <= 0 || outboundCases > selectedProduct.cases) {
      toast({
        title: "エラー",
        description: "出荷数量が不正です。",
        variant: "destructive",
      });
      return;
    }

    // 商品データの更新
    const updatedProduct = { ...product };
    const locationIndex = updatedProduct.locations.findIndex(
      loc => loc.column === selectedLocation.column &&
            loc.position.toString() === selectedLocation.position.toString() &&
            loc.level.toString() === selectedLocation.level.toString()
    );

    if (locationIndex === -1) {
      toast({
        title: "エラー",
        description: "保管場所が見つかりません。",
        variant: "destructive",
      });
      return;
    }

    const location = updatedProduct.locations[locationIndex];
    location.cases -= outboundCases;

    // ケース数が0になった場合は場所を削除
    if (location.cases === 0) {
      updatedProduct.locations.splice(locationIndex, 1);
    }

    // 総数の更新
    updatedProduct.totalCases -= outboundCases;
    updatedProduct.totalQuantity -= outboundCases * updatedProduct.quantityPerCase;

    // 商品データを更新
    updateProduct(product.code, updatedProduct);

    // 履歴を追加
    addHistory({
      productCode: product.code,
      type: 'outbound',
      cases: outboundCases,
      quantity: outboundCases * product.quantityPerCase,
      fromLocation: {
        column: selectedLocation.column,
        position: selectedLocation.position.toString(),
        level: selectedLocation.level.toString(),
        cases: outboundCases
      }
    });

    toast({
      title: "出荷完了",
      description: `${product.name}を${outboundCases}ケース出荷しました。`,
    });

    // ダイアログを閉じてステートをリセット
    setIsOutboundDialogOpen(false);
    setOutboundCases(0);
    setSelectedProduct(null);
  };

  // 出荷ダイアログを開く
  const openOutboundDialog = (product: {
    code: string;
    name: string;
    cases: number;
    quantity: number;
  }) => {
    setSelectedProduct(product);
    setOutboundCases(0);
    setIsOutboundDialogOpen(true);
  };

  // 固定の3レベル
  const SHELF_LEVELS = [3, 2, 1]; // 表示順を上から下にするため逆順

  // 最大の番目数を取得
  const maxPositions = Object.values(shelfConfigs).reduce((max, config) => 
    Math.max(max, config.positions), 0
  );

  // 列ヘッダーの生成
  const columnHeaders = getColumns().map((column) => (
    <div key={column} className="flex-none w-32">
      <div className="text-center font-bold h-full flex items-center justify-center bg-gray-100 rounded-md">
        {column}列
      </div>
    </div>
  ));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-[300px]">
          <Input
            placeholder="商品コードまたは商品名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* 選択場所の詳細を上部に移動 */}
      {selectedLocation && (
        <Card>
          <CardHeader>
            <CardTitle>
              選択場所の詳細: {selectedLocation.column}列 {selectedLocation.position}番目 レベル{selectedLocation.level}
              {selectedLocation.level === 3 && "以上"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getLocationStock(
                selectedLocation.column,
                selectedLocation.position,
                selectedLocation.level
              ).map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">商品コード: {item.code}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{item.cases}ケース</div>
                      <div className="text-sm text-gray-500">{item.quantity}個</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openOutboundDialog(item)}
                    >
                      <ArrowDownRight className="mr-1 h-4 w-4" />
                      出荷
                    </Button>
                  </div>
                </div>
              ))}
              {getLocationStock(
                selectedLocation.column,
                selectedLocation.position,
                selectedLocation.level
              ).length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  この場所には商品が保管されていません
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 検索結果の表示 */}
      {searchTerm && (
        <Card>
          <CardHeader>
            <CardTitle>検索結果</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map(product => {
                    const locations = getProductLocations(product);
                    return (
                      <div key={product.code} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">商品コード: {product.code}</div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            保管場所: {locations.length}箇所
                          </div>
                        </div>
                        <div className="space-y-2">
                          {locations.map((loc, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => scrollToLocation(loc.column, loc.position, loc.level)}
                            >
                              <span>
                                {loc.column}列 {loc.position}番目 レベル{loc.level}
                                {loc.level >= 3 && "以上"}
                              </span>
                              <div className="flex items-center text-blue-600">
                                <span className="mr-1">{loc.cases}箱</span>
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    該当する商品が見つかりませんでした
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 棚配置図 */}
      <Card>
        <CardHeader>
          <CardTitle>棚配置図</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative border rounded-md h-[600px]">
            {/* 左側固定のヘッダー */}
            <div className="absolute left-0 top-0 w-32 h-8 bg-white z-20 border-r border-b">
              <div className="h-full"></div>
            </div>

            {/* 列ヘッダー（固定） */}
            <div className="absolute left-32 right-0 top-0 h-8 bg-white z-20 border-b">
              <div ref={headerRef} className="h-full overflow-hidden">
                <div className="inline-flex gap-2 p-2 min-w-full">
                  {columnHeaders}
                </div>
              </div>
            </div>

            {/* 左側固定の番目とレベル表示 */}
            <div ref={sidebarRef} className="absolute left-0 top-8 bottom-0 w-32 bg-white z-10 border-r overflow-hidden">
              <div className="h-full">
                {Array.from({ length: maxPositions }, (_, i) => i + 1).map((position, index) => (
                  <div key={position}>
                    <div className="flex mt-2">
                      {/* 番目の表示（縦書き） */}
                      <div className="position-number-container border-r">
                        <div className="writing-vertical-rl text-sm font-medium text-gray-600">
                          {position}番目
                        </div>
                      </div>
                      {/* レベルの表示 */}
                      <div className="flex-1 space-y-1">
                        {SHELF_LEVELS.map((level) => (
                          <div key={level} className="h-12 flex items-center justify-center text-sm font-medium text-gray-600">
                            レベル{level}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* 各番目の区切り線 */}
                    {index < maxPositions - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* メインコンテンツ（スクロール可能） */}
            <div ref={contentRef} className="absolute left-32 right-0 top-8 bottom-0 overflow-auto">
              <div className="inline-flex gap-2 p-2 min-w-full">
                {getColumns().map((column) => (
                  <div key={column} className="flex-none w-32">
                    <div className="space-y-2">
                      {Array.from({ length: shelfConfigs[column].positions }, (_, i) => i + 1).map((position, index) => (
                        <div key={position}>
                          <div className="grid grid-cols-1 gap-1">
                            {SHELF_LEVELS.map((level) => {
                              const items = getLocationStock(column, position, level);
                              const status = getLocationStatus(items);
                              const isHighlighted = shouldHighlight(column, position, level);
                              const isSelected = selectedLocation?.column === column &&
                                               selectedLocation?.position === position &&
                                               selectedLocation?.level === level;

                              // レベルが設定された最大レベルを超える場合は表示しない
                              if (level < 3 && level > shelfConfigs[column].levels) {
                                return null;
                              }

                              return (
                                <TooltipProvider key={level}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "h-12 rounded-md border cursor-pointer transition-all p-1",
                                          "hover:border-blue-500 hover:shadow-md",
                                          status === "empty" && "bg-gray-100",
                                          status === "normal" && "bg-green-100",
                                          status === "full" && "bg-orange-100",
                                          isHighlighted && "ring-2 ring-blue-500",
                                          isSelected && "ring-2 ring-blue-600 border-blue-600"
                                        )}
                                        onClick={() => setSelectedLocation({ column, position, level })}
                                      >
                                        {items.length > 0 && (
                                          <div className="flex items-center justify-between h-full">
                                            <div className="flex-1 text-xs overflow-hidden">
                                              {items.length === 1 ? (
                                                <div className="truncate">
                                                  {items[0].name}
                                                </div>
                                              ) : (
                                                <div className="flex items-center space-x-1">
                                                  <Package className="h-3 w-3" />
                                                  <span>{items.length}商品</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                              {items.reduce((sum, item) => sum + item.cases, 0)}箱
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-sm">
                                        <div className="font-bold mb-1">
                                          {column}列 {position}番目 レベル{level}
                                          {level === 3 && "以上"}
                                        </div>
                                        {items.length > 0 ? (
                                          <div className="space-y-1">
                                            {items.map((item, index) => (
                                              <div key={index}>
                                                {item.name}: {item.cases}箱 ({item.quantity}個)
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div>空き</div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                          {/* 各番目の区切り線 */}
                          {index < shelfConfigs[column].positions - 1 && (
                            <Separator className="my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 出荷ダイアログ */}
      <Dialog open={isOutboundDialogOpen} onOpenChange={setIsOutboundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品の出荷</DialogTitle>
            <DialogDescription>
              出荷する数量を入力してください
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>商品情報</Label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedProduct.name}</div>
                  <div className="text-sm text-gray-500">商品コード: {selectedProduct.code}</div>
                  <div className="mt-2 text-sm">
                    現在庫: {selectedProduct.cases}ケース ({selectedProduct.quantity}個)
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outboundCases">出荷数量（ケース）</Label>
                <Input
                  id="outboundCases"
                  type="number"
                  min="1"
                  max={selectedProduct.cases}
                  value={outboundCases || ''}
                  onChange={(e) => setOutboundCases(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOutboundDialogOpen(false);
                setOutboundCases(0);
                setSelectedProduct(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleOutbound}
              disabled={!selectedProduct || outboundCases <= 0 || outboundCases > selectedProduct.cases}
              className="bg-red-600 hover:bg-red-700"
            >
              出荷実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
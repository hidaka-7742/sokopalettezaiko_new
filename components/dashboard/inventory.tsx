"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownRight, ArrowUpRight, MoveRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductStore } from "@/lib/store";

interface Location {
  column: string;
  position: string;
  level: string;
}

export function Inventory() {
  const { toast } = useToast();
  const { products, updateProduct, addHistory, shelfConfigs } = useProductStore();
  const [searchInbound, setSearchInbound] = useState("");
  const [searchOutbound, setSearchOutbound] = useState("");
  const [searchMove, setSearchMove] = useState("");
  const [selectedInbound, setSelectedInbound] = useState("");
  const [selectedOutbound, setSelectedOutbound] = useState("");
  const [selectedMove, setSelectedMove] = useState("");
  const [selectedInboundColumn, setSelectedInboundColumn] = useState("");
  const [selectedInboundPosition, setSelectedInboundPosition] = useState("");
  const [selectedInboundLevel, setSelectedInboundLevel] = useState("");
  const [selectedOutboundColumn, setSelectedOutboundColumn] = useState("");
  const [selectedOutboundPosition, setSelectedOutboundPosition] = useState("");
  const [selectedOutboundLevel, setSelectedOutboundLevel] = useState("");
  const [selectedMoveFromColumn, setSelectedMoveFromColumn] = useState("");
  const [selectedMoveFromPosition, setSelectedMoveFromPosition] = useState("");
  const [selectedMoveFromLevel, setSelectedMoveFromLevel] = useState("");
  const [selectedMoveToColumn, setSelectedMoveToColumn] = useState("");
  const [selectedMoveToPosition, setSelectedMoveToPosition] = useState("");
  const [selectedMoveToLevel, setSelectedMoveToLevel] = useState("");
  const [inboundCases, setInboundCases] = useState<number>(0);
  const [outboundCases, setOutboundCases] = useState<number>(0);
  const [moveCases, setMoveCases] = useState<number>(0);

  // 利用可能な列を取得
  const getColumns = () => Object.keys(shelfConfigs).sort();

  // 特定の列の番目の数を取得
  const getPositions = (column: string) => {
    if (!column) return [];
    const config = shelfConfigs[column];
    return Array.from({ length: config?.positions || 0 }, (_, i) => i + 1);
  };

  // 特定の列のレベル数を取得
  const getLevels = (column: string) => {
    if (!column) return [];
    const config = shelfConfigs[column];
    return Array.from({ length: config?.levels || 0 }, (_, i) => i + 1);
  };

  const handleSearchBasedAction = (type: 'inbound' | 'outbound' | 'move') => {
    let actionText = '';
    let location: Location | null = null;
    let product = null;
    let cases = 0;

    switch (type) {
      case 'inbound':
        if (!selectedInbound || !selectedInboundColumn || !selectedInboundPosition || !selectedInboundLevel || !inboundCases) {
          toast({
            title: "エラー",
            description: "必要な情報が不足しています。",
            variant: "destructive",
          });
          return;
        }
        actionText = '入庫';
        product = products.find(p => p.code === selectedInbound);
        location = {
          column: selectedInboundColumn,
          position: selectedInboundPosition,
          level: selectedInboundLevel
        };
        cases = inboundCases;
        break;

      case 'outbound':
        if (!selectedOutbound || !selectedOutboundColumn || !selectedOutboundPosition || !selectedOutboundLevel || !outboundCases) {
          toast({
            title: "エラー",
            description: "必要な情報が不足しています。",
            variant: "destructive",
          });
          return;
        }
        actionText = '出庫';
        product = products.find(p => p.code === selectedOutbound);
        location = {
          column: selectedOutboundColumn,
          position: selectedOutboundPosition,
          level: selectedOutboundLevel
        };
        cases = outboundCases;
        break;

      case 'move':
        if (!selectedMove || !selectedMoveFromColumn || !selectedMoveFromPosition || !selectedMoveFromLevel ||
            !selectedMoveToColumn || !selectedMoveToPosition || !selectedMoveToLevel || !moveCases) {
          toast({
            title: "エラー",
            description: "必要な情報が不足しています。",
            variant: "destructive",
          });
          return;
        }
        actionText = '移動';
        product = products.find(p => p.code === selectedMove);
        location = {
          column: selectedMoveFromColumn,
          position: selectedMoveFromPosition,
          level: selectedMoveFromLevel
        };
        cases = moveCases;
        break;
    }

    if (!product || !location) {
      toast({
        title: "エラー",
        description: "商品または場所の情報が不正です。",
        variant: "destructive",
      });
      return;
    }

    // 在庫データの更新
    const updatedProduct = { ...product };
    
    if (type === 'inbound') {
      // 入庫処理
      const existingLocation = updatedProduct.locations.find(
        loc => loc.column === location!.column && 
              loc.position === location!.position && 
              loc.level === location!.level
      );

      if (existingLocation) {
        existingLocation.cases += cases;
      } else {
        updatedProduct.locations.push({
          column: location.column,
          position: location.position,
          level: location.level,
          cases: cases
        });
      }

      updatedProduct.totalCases += cases;
      updatedProduct.totalQuantity += cases * updatedProduct.quantityPerCase;

      // 履歴を追加
      addHistory({
        productCode: product.code,
        type: 'inbound',
        cases,
        quantity: cases * product.quantityPerCase,
        toLocation: location
      });

    } else if (type === 'outbound') {
      // 出庫処理
      const locationIndex = updatedProduct.locations.findIndex(
        loc => loc.column === location!.column && 
              loc.position === location!.position && 
              loc.level === location!.level
      );

      if (locationIndex === -1) {
        toast({
          title: "エラー",
          description: "指定された場所に在庫がありません。",
          variant: "destructive",
        });
        return;
      }

      const existingLocation = updatedProduct.locations[locationIndex];
      if (existingLocation.cases < cases) {
        toast({
          title: "エラー",
          description: "指定された数量が在庫数を超えています。",
          variant: "destructive",
        });
        return;
      }

      existingLocation.cases -= cases;
      if (existingLocation.cases === 0) {
        updatedProduct.locations.splice(locationIndex, 1);
      }

      updatedProduct.totalCases -= cases;
      updatedProduct.totalQuantity -= cases * updatedProduct.quantityPerCase;

      // 履歴を追加
      addHistory({
        productCode: product.code,
        type: 'outbound',
        cases,
        quantity: cases * product.quantityPerCase,
        fromLocation: location,
        toLocation: location
      });

    } else if (type === 'move') {
      // 移動処理
      const fromLocationIndex = updatedProduct.locations.findIndex(
        loc => loc.column === location!.column && 
              loc.position === location!.position && 
              loc.level === location!.level
      );

      if (fromLocationIndex === -1) {
        toast({
          title: "エラー",
          description: "移動元の場所に在庫がありません。",
          variant: "destructive",
        });
        return;
      }

      const fromLocation = updatedProduct.locations[fromLocationIndex];
      if (fromLocation.cases < cases) {
        toast({
          title: "エラー",
          description: "指定された数量が在庫数を超えています。",
          variant: "destructive",
        });
        return;
      }

      // 移動元から減らす
      fromLocation.cases -= cases;
      if (fromLocation.cases === 0) {
        updatedProduct.locations.splice(fromLocationIndex, 1);
      }

      // 移動先に追加
      const toLocation = updatedProduct.locations.find(
        loc => loc.column === selectedMoveToColumn && 
              loc.position === selectedMoveToPosition && 
              loc.level === selectedMoveToLevel
      );

      if (toLocation) {
        toLocation.cases += cases;
      } else {
        updatedProduct.locations.push({
          column: selectedMoveToColumn,
          position: selectedMoveToPosition,
          level: selectedMoveToLevel,
          cases: cases
        });
      }

      // 履歴を追加
      addHistory({
        productCode: product.code,
        type: 'move',
        cases,
        quantity: cases * product.quantityPerCase,
        fromLocation: location,
        toLocation: {
          column: selectedMoveToColumn,
          position: selectedMoveToPosition,
          level: selectedMoveToLevel
        }
      });
    }

    // 商品データを更新
    updateProduct(product.code, updatedProduct);

    toast({
      title: `${actionText}完了`,
      description: `${product.name}を${cases}ケース${actionText}しました。`,
    });

    // フォームをリセット
    switch (type) {
      case 'inbound':
        setSelectedInbound("");
        setSelectedInboundColumn("");
        setSelectedInboundPosition("");
        setSelectedInboundLevel("");
        setInboundCases(0);
        setSearchInbound("");
        break;
      case 'outbound':
        setSelectedOutbound("");
        setSelectedOutboundColumn("");
        setSelectedOutboundPosition("");
        setSelectedOutboundLevel("");
        setOutboundCases(0);
        setSearchOutbound("");
        break;
      case 'move':
        setSelectedMove("");
        setSelectedMoveFromColumn("");
        setSelectedMoveFromPosition("");
        setSelectedMoveFromLevel("");
        setSelectedMoveToColumn("");
        setSelectedMoveToPosition("");
        setSelectedMoveToLevel("");
        setMoveCases(0);
        setSearchMove("");
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              入庫処理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>商品選択</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input 
                      placeholder="商品コードまたは商品名で検索" 
                      value={searchInbound}
                      onChange={(e) => setSearchInbound(e.target.value)}
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {searchInbound && (
                    <Select value={selectedInbound} onValueChange={setSelectedInbound}>
                      <SelectTrigger>
                        <SelectValue placeholder="商品を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => 
                            p.code.toLowerCase().includes(searchInbound.toLowerCase()) ||
                            p.name.toLowerCase().includes(searchInbound.toLowerCase())
                          )
                          .map(product => (
                            <SelectItem key={product.code} value={product.code}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <Label>保管場所の選択</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedInboundColumn} onValueChange={setSelectedInboundColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="列" />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumns().map(column => (
                        <SelectItem key={column} value={column}>{column}列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedInboundPosition} 
                    onValueChange={setSelectedInboundPosition}
                    disabled={!selectedInboundColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="番目" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositions(selectedInboundColumn).map(position => (
                        <SelectItem key={position} value={position.toString()}>{position}番目</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedInboundLevel} 
                    onValueChange={setSelectedInboundLevel}
                    disabled={!selectedInboundColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="レベル" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLevels(selectedInboundColumn).map(level => (
                        <SelectItem key={level} value={level.toString()}>レベル {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="ケース数" 
                  value={inboundCases || ''}
                  onChange={(e) => setInboundCases(parseInt(e.target.value) || 0)} min="1"
                />
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleSearchBasedAction('inbound')}
                >
                  入庫登録
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <ArrowDownRight className="mr-2 h-4 w-4" />
              出庫処理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>商品選択</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input 
                      placeholder="商品コードまたは商品名で検索" 
                      value={searchOutbound}
                      onChange={(e) => setSearchOutbound(e.target.value)}
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {searchOutbound && (
                    <Select value={selectedOutbound} onValueChange={setSelectedOutbound}>
                      <SelectTrigger>
                        <SelectValue placeholder="商品を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => 
                            p.code.toLowerCase().includes(searchOutbound.toLowerCase()) ||
                            p.name.toLowerCase().includes(searchOutbound.toLowerCase())
                          )
                          .map(product => (
                            <SelectItem key={product.code} value={product.code}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <Label>保管場所の選択</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedOutboundColumn} onValueChange={setSelectedOutboundColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="列" />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumns().map(column => (
                        <SelectItem key={column} value={column}>{column}列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedOutboundPosition} 
                    onValueChange={setSelectedOutboundPosition}
                    disabled={!selectedOutboundColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="番目" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositions(selectedOutboundColumn).map(position => (
                        <SelectItem key={position} value={position.toString()}>{position}番目</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedOutboundLevel} 
                    onValueChange={setSelectedOutboundLevel}
                    disabled={!selectedOutboundColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="レベル" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLevels(selectedOutboundColumn).map(level => (
                        <SelectItem key={level} value={level.toString()}>レベル {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="ケース数" 
                  value={outboundCases || ''}
                  onChange={(e) => setOutboundCases(parseInt(e.target.value) || 0)}
                  min="1"
                />
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleSearchBasedAction('outbound')}
                >
                  出庫登録
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <MoveRight className="mr-2 h-4 w-4" />
              在庫移動
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>商品選択</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input 
                      placeholder="商品コードまたは商品名で検索" 
                      value={searchMove}
                      onChange={(e) => setSearchMove(e.target.value)}
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  {searchMove && (
                    <Select value={selectedMove} onValueChange={setSelectedMove}>
                      <SelectTrigger>
                        <SelectValue placeholder="商品を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {products
                          .filter(p => 
                            p.code.toLowerCase().includes(searchMove.toLowerCase()) ||
                            p.name.toLowerCase().includes(searchMove.toLowerCase())
                          )
                          .map(product => (
                            <SelectItem key={product.code} value={product.code}>
                              {product.name} ({product.code})
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div>
                <Label>移動元の選択</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedMoveFromColumn} onValueChange={setSelectedMoveFromColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="列" />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumns().map(column => (
                        <SelectItem key={column} value={column}>{column}列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedMoveFromPosition} 
                    onValueChange={setSelectedMoveFromPosition}
                    disabled={!selectedMoveFromColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="番目" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositions(selectedMoveFromColumn).map(position => (
                        <SelectItem key={position} value={position.toString()}>{position}番目</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedMoveFromLevel} 
                    onValueChange={setSelectedMoveFromLevel}
                    disabled={!selectedMoveFromColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="レベル" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLevels(selectedMoveFromColumn).map(level => (
                        <SelectItem key={level} value={level.toString()}>レベル {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>移動先の選択</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={selectedMoveToColumn} onValueChange={setSelectedMoveToColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="列" />
                    </SelectTrigger>
                    <SelectContent>
                      {getColumns().map(column => (
                        <SelectItem key={column} value={column}>{column}列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedMoveToPosition} 
                    onValueChange={setSelectedMoveToPosition}
                    disabled={!selectedMoveToColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="番目" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositions(selectedMoveToColumn).map(position => (
                        <SelectItem key={position} value={position.toString()}>{position}番目</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={selectedMoveToLevel} 
                    onValueChange={setSelectedMoveToLevel}
                    disabled={!selectedMoveToColumn}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="レベル" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLevels(selectedMoveToColumn).map(level => (
                        <SelectItem key={level} value={level.toString()}>レベル {level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="ケース数" 
                  value={moveCases || ''}
                  onChange={(e) => setMoveCases(parseInt(e.target.value) || 0)}
                  min="1"
                />
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSearchBasedAction('move')}
                >
                  移動実行
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
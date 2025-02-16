"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, FileWarning, FileText, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useProductStore, type Product } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// CSVテンプレートデータ
const csvTemplates = {
  products: [
    ['商品コード', '商品名', 'ケースあたりの数量', '最小在庫数'],
    ['PRD001', 'プレミアムコーヒー豆', '24', '800'],
    ['PRD002', 'オーガニック紅茶', '36', '720'],
    ['PRD003', '抹茶パウダー', '20', '400'],
  ],
  shelves: [
    ['商品コード', '列', '番目', 'レベル', 'ケース数'],
    ['PRD001', 'A', '1', '1', '24'],
    ['PRD001', 'B', '3', '2', '26'],
    ['PRD002', 'A', '1', '1', '12'],
  ],
};

export function Reports() {
  const { toast } = useToast();
  const { products, history, setProducts, addHistory } = useProductStore();
  const [importType, setImportType] = useState<'products' | 'shelves' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
    } else {
      toast({
        title: "エラー",
        description: "CSVファイルを選択してください。",
        variant: "destructive",
      });
      e.target.value = '';
    }
  };

  const handleImport = () => {
    if (!selectedFile || !importType) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください。",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(selectedFile, {
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            throw new Error('CSVファイルの解析中にエラーが発生しました');
          }

          const rows = results.data as string[][];
          if (rows.length < 2) {
            throw new Error('データが不足しています');
          }

          // ヘッダーの検証
          const headers = rows[0];
          if (importType === 'products') {
            if (!validateProductHeaders(headers)) {
              throw new Error('商品データのヘッダーが正しくありません');
            }
            
            // 商品データの処理
            const newProducts: Product[] = rows.slice(1)
              .filter(row => row.length >= 4 && row[0] && row[1] && row[2] && row[3])
              .map(row => ({
                code: row[0].trim(),
                name: row[1].trim(),
                quantityPerCase: parseInt(row[2].trim(), 10),
                minimumStock: parseInt(row[3].trim(), 10),
                totalCases: 0,
                totalQuantity: 0,
                locations: []
              }));

            if (newProducts.length === 0) {
              throw new Error('有効な商品データが見つかりませんでした');
            }

            // 既存の商品データとマージ
            const existingCodes = new Set(products.map(p => p.code));
            const uniqueNewProducts = newProducts.filter(p => !existingCodes.has(p.code));
            
            if (uniqueNewProducts.length === 0) {
              throw new Error('すべての商品コードが既に存在します');
            }

            setProducts([...products, ...uniqueNewProducts]);

            toast({
              title: "インポート完了",
              description: `${uniqueNewProducts.length}件の商品データをインポートしました。`,
            });
          } else if (importType === 'shelves') {
            if (!validateShelfHeaders(headers)) {
              throw new Error('棚割り当てデータのヘッダーが正しくありません');
            }

            // 棚割り当てデータの処理
            const shelfAssignments = rows.slice(1)
              .filter(row => row.length >= 5 && row.every(cell => cell.trim()))
              .map(row => ({
                code: row[0].trim(),
                column: row[1].trim(),
                position: row[2].trim(),
                level: row[3].trim(),
                cases: parseInt(row[4].trim(), 10)
              }));

            if (shelfAssignments.length === 0) {
              throw new Error('有効な棚割り当てデータが見つかりませんでした');
            }

            // 商品データの更新
            const updatedProducts = products.map(product => {
              const assignments = shelfAssignments.filter(a => a.code === product.code);
              if (assignments.length === 0) return product;

              const locations = assignments.map(a => ({
                column: a.column,
                position: a.position,
                level: a.level,
                cases: a.cases
              }));

              const totalCases = locations.reduce((sum, loc) => sum + loc.cases, 0);
              const totalQuantity = totalCases * product.quantityPerCase;

              // 履歴を追加
              locations.forEach(loc => {
                addHistory({
                  productCode: product.code,
                  type: 'inbound',
                  cases: loc.cases,
                  quantity: loc.cases * product.quantityPerCase,
                  toLocation: loc
                });
              });

              return {
                ...product,
                locations,
                totalCases,
                totalQuantity
              };
            });

            setProducts(updatedProducts);

            toast({
              title: "インポート完了",
              description: "棚割り当てデータをインポートしました。",
            });
          }

          setIsImportDialogOpen(false);
          setSelectedFile(null);
          setImportType(null);
        } catch (error) {
          toast({
            title: "エラー",
            description: error instanceof Error ? error.message : "ファイルの処理中にエラーが発生しました。",
            variant: "destructive",
          });
        }
      },
      header: false,
      skipEmptyLines: true
    });
  };

  const validateProductHeaders = (headers: string[]) => {
    const requiredHeaders = ['商品コード', '商品名', 'ケースあたりの数量', '最小在庫数'];
    return headers.length >= requiredHeaders.length &&
           requiredHeaders.every((header, index) => headers[index].trim() === header);
  };

  const validateShelfHeaders = (headers: string[]) => {
    const requiredHeaders = ['商品コード', '列', '番目', 'レベル', 'ケース数'];
    return headers.length >= requiredHeaders.length &&
           requiredHeaders.every((header, index) => headers[index].trim() === header);
  };

  const handleExport = (type: 'inventory' | 'transactions' | 'alerts' | 'history') => {
    let data: string[][] = [];
    let filename = '';

    switch (type) {
      case 'inventory':
        data = [
          ['商品コード', '商品名', '総ケース数', '総在庫数', '最小在庫数'],
          ...products.map(item => [
            item.code,
            item.name,
            item.totalCases.toString(),
            item.totalQuantity.toString(),
            item.minimumStock.toString()
          ])
        ];
        filename = '在庫状況.csv';
        break;

      case 'alerts':
        data = [
          ['商品コード', '商品名', '現在庫数', '最小在庫数', '不足数'],
          ...products
            .filter(item => item.totalQuantity < item.minimumStock)
            .map(item => [
              item.code,
              item.name,
              item.totalQuantity.toString(),
              item.minimumStock.toString(),
              (item.minimumStock - item.totalQuantity).toString()
            ])
        ];
        filename = '在庫不足レポート.csv';
        break;

      case 'history':
        data = [
          ['日時', '商品コード', '商品名', '操作', 'ケース数', '数量', '移動元', '移動先'],
          ...history.map(item => {
            const product = products.find(p => p.code === item.productCode);
            const fromLocation = item.fromLocation 
              ? `${item.fromLocation.column}列${item.fromLocation.position}番目レベル${item.fromLocation.level}`
              : '';
            const toLocation = item.toLocation
              ? `${item.toLocation.column}列${item.toLocation.position}番目レベル${item.toLocation.level}`
              : '';
            return [
              format(item.timestamp, 'yyyy/MM/dd HH:mm:ss'),
              item.productCode,
              product?.name || '',
              item.type === 'inbound' ? '入庫' : item.type === 'outbound' ? '出庫' : '移動',
              item.cases.toString(),
              item.quantity.toString(),
              fromLocation,
              toLocation
            ];
          })
        ];
        filename = '在庫履歴.csv';
        break;
    }

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "エクスポート完了",
      description: `${filename}をダウンロードしました。`,
    });
  };

  const handleTemplateDownload = (type: 'products' | 'shelves') => {
    const data = csvTemplates[type];
    const filename = type === 'products' ? '商品データ_テンプレート.csv' : '棚割り当て_テンプレート.csv';
    
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "テンプレートダウンロード完了",
      description: `${filename}をダウンロードしました。`,
    });
  };

  // 履歴の検索とフィルタリング
  const filteredHistory = history.filter(item => {
    const product = products.find(p => p.code === item.productCode);
    return (
      item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">在庫履歴</TabsTrigger>
          <TabsTrigger value="import-export">データ入出力</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-semibold">在庫履歴</CardTitle>
              <Button 
                variant="outline" 
                className="ml-auto"
                onClick={() => handleExport('history')}
              >
                <Download className="mr-2 h-4 w-4" />
                CSVエクスポート
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="商品コードまたは商品名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>商品</TableHead>
                        <TableHead>操作</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>場所</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => {
                        const product = products.find(p => p.code === item.productCode);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">
                              {format(item.timestamp, 'yyyy/MM/dd HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{product?.name}</div>
                              <div className="text-sm text-gray-500">{item.productCode}</div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                item.type === 'inbound' 
                                  ? 'bg-green-100 text-green-800'
                                  : item.type === 'outbound'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {item.type === 'inbound' ? '入庫' : item.type === 'outbound' ? '出庫' : '移動'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{item.cases}ケース</div>
                              <div className="text-sm text-gray-500">{item.quantity}個</div>
                            </TableCell>
                            <TableCell>
                              {item.type === 'move' ? (
                                <>
                                  <div className="text-sm">
                                    From: {item.fromLocation?.column}列
                                    {item.fromLocation?.position}番目
                                    レベル{item.fromLocation?.level}
                                  </div>
                                  <div className="text-sm">
                                    To: {item.toLocation?.column}列
                                    {item.toLocation?.position}番目
                                    レベル{item.toLocation?.level}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm">
                                  {item.toLocation?.column}列
                                  {item.toLocation?.position}番目
                                  レベル{item.toLocation?.level}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>データインポート</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  CSVファイルから商品データと棚割り当てをインポートできます。
                </p>
                <div className="grid gap-2">
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setImportType('products');
                          setSelectedFile(null);
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        商品データインポート
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {importType === 'products' ? '商品データ' : '棚割り当て'}のインポート
                        </DialogTitle>
                        <DialogDescription>
                          CSVファイルを選択してインポートを実行してください。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>CSVファイルを選択</Label>
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                          />
                        </div>
                        {selectedFile && (
                          <div className="text-sm text-muted-foreground">
                            選択されたファイル: {selectedFile.name}
                          </div>
                        )}
                        {!selectedFile && (
                          <div className="flex items-center text-yellow-600 text-sm">
                            <FileWarning className="h-4 w-4 mr-2" />
                            ファイルが選択されていません
                          </div>
                        )}
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <Label>CSVファイルの形式</Label>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>以下の列が必要です：</p>
                            {importType === 'products' ? (
                              <ul className="list-disc list-inside">
                                <li>商品コード (例: PRD001)</li>
                                <li>商品名 (例: プレミアムコーヒー豆)</li>
                                <li>ケースあたりの数量 (例: 24)</li>
                                <li>最小在庫数 (例: 800)</li>
                              </ul>
                            ) : (
                              <ul className="list-disc list-inside">
                                <li>商品コード (例: PRD001)</li>
                                <li>列 (例: A)</li>
                                <li>番目 (例: 1)</li>
                                <li>レベル (例: 1)</li>
                                <li>ケース数 (例: 24)</li>
                              </ul>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full mt-2"
                            onClick={() => handleTemplateDownload(importType || 'products')}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            テンプレートをダウンロード
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsImportDialogOpen(false);
                            setSelectedFile(null);
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={!selectedFile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          インポート実行
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setImportType('shelves');
                          setSelectedFile(null);
                        }}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        棚割り当てインポート
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>棚割り当てのインポート</DialogTitle>
                        <DialogDescription>
                          CSVファイルを選択してインポートを実行してください。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>CSVファイルを選択</Label>
                          <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                          />
                        </div>
                        {selectedFile && (
                          <div className="text-sm text-muted-foreground">
                            選択されたファイル: {selectedFile.name}
                          </div>
                        )}
                        {!selectedFile && (
                          <div className="flex items-center text-yellow-600 text-sm">
                            <FileWarning className="h-4 w-4 mr-2" />
                            ファイルが選択されていません
                          </div>
                        )}
                        <Separator className="my-4" />
                        <div className="space-y-2">
                          <Label>CSVファイルの形式</Label>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>以下の列が必要です：</p>
                            <ul className="list-disc list-inside">
                              <li>商品コード (例: PRD001)</li>
                              <li>列 (例: A)</li>
                              <li>番目 (例: 1)</li>
                              <li>レベル (例: 1)</li>
                              <li>ケース数 (例: 24)</li>
                            </ul>
                          </div>
                          <Button 
                            variant="outline" 
                            className="w-full mt-2"
                            onClick={() => handleTemplateDownload('shelves')}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            テンプレートをダウンロード
                          </Button>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsImportDialogOpen(false);
                            setSelectedFile(null);
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={!selectedFile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          インポート実行
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>レポート出力</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  在庫状況と取引履歴のレポートをダウンロードできます。
                </p>
                <div className="grid gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExport('inventory')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    現在の在庫状況
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExport('alerts')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    在庫不足レポート
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExport('history')}
                  >
                    <History className="mr-2 h-4 w-4" />
                    在庫履歴
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
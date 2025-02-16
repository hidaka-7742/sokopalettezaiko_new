"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProductStore } from "@/lib/store";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function Products() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    code: "",
    name: "",
    quantityPerCase: "",
    minimumStock: ""
  });
  const [editingProduct, setEditingProduct] = useState<{
    code: string;
    name: string;
    quantityPerCase: string;
    minimumStock: string;
  } | null>(null);

  const { products, addProduct, updateProduct, deleteProduct } = useProductStore();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const { name, value } = e.target;
    if (isEdit && editingProduct) {
      setEditingProduct(prev => ({
        ...prev!,
        [name]: value
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = () => {
    // バリデーション
    if (!newProduct.code || !newProduct.name || !newProduct.quantityPerCase || !newProduct.minimumStock) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください。",
        variant: "destructive",
      });
      return;
    }

    // 商品コードの重複チェック
    if (products.some(p => p.code === newProduct.code)) {
      toast({
        title: "エラー",
        description: "この商品コードは既に使用されています。",
        variant: "destructive",
      });
      return;
    }

    // 新商品を追加
    const newProductData = {
      ...newProduct,
      quantityPerCase: parseInt(newProduct.quantityPerCase),
      minimumStock: parseInt(newProduct.minimumStock),
      totalCases: 0,
      totalQuantity: 0,
      locations: [],
    };

    addProduct(newProductData);
    
    // フォームをリセット
    setNewProduct({
      code: "",
      name: "",
      quantityPerCase: "",
      minimumStock: ""
    });
    
    setIsNewDialogOpen(false);

    toast({
      title: "商品登録完了",
      description: `${newProduct.name}を登録しました。`,
    });
  };

  const handleEdit = (product: typeof products[0]) => {
    setEditingProduct({
      code: product.code,
      name: product.name,
      quantityPerCase: product.quantityPerCase.toString(),
      minimumStock: product.minimumStock.toString()
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingProduct) return;

    // バリデーション
    if (!editingProduct.name || !editingProduct.quantityPerCase || !editingProduct.minimumStock) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください。",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.code === editingProduct.code);
    if (!product) {
      toast({
        title: "エラー",
        description: "商品が見つかりません。",
        variant: "destructive",
      });
      return;
    }

    // 商品データを更新
    const updatedProduct = {
      ...product,
      name: editingProduct.name,
      quantityPerCase: parseInt(editingProduct.quantityPerCase),
      minimumStock: parseInt(editingProduct.minimumStock),
      // 総在庫数を新しいケースあたり数量で再計算
      totalQuantity: product.totalCases * parseInt(editingProduct.quantityPerCase)
    };

    updateProduct(product.code, updatedProduct);
    
    setIsEditDialogOpen(false);
    setEditingProduct(null);

    toast({
      title: "商品情報更新完了",
      description: `${updatedProduct.name}の情報を更新しました。`,
    });
  };

  const handleDeleteClick = (code: string) => {
    setProductToDelete(code);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!productToDelete) return;

    const product = products.find(p => p.code === productToDelete);
    if (!product) return;

    // 在庫の有無をチェック
    if (product.totalCases > 0) {
      toast({
        title: "削除できません",
        description: "在庫が残っている商品は削除できません。先に在庫を処理してください。",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      return;
    }

    deleteProduct(productToDelete);
    
    toast({
      title: "商品削除完了",
      description: `${product.name}を削除しました。`,
    });

    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const filteredProducts = products
    .filter(product => 
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

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
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> 商品登録
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規商品登録</DialogTitle>
              <DialogDescription>
                新しい商品の情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">商品コード</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="例: PRD001"
                  value={newProduct.code}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">商品名</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="例: プレミアムコーヒー豆"
                  value={newProduct.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityPerCase">ケースあたりの数量</Label>
                <Input
                  id="quantityPerCase"
                  name="quantityPerCase"
                  type="number"
                  min="1"
                  placeholder="例: 24"
                  value={newProduct.quantityPerCase}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumStock">最小在庫数</Label>
                <Input
                  id="minimumStock"
                  name="minimumStock"
                  type="number"
                  min="0"
                  placeholder="例: 800"
                  value={newProduct.minimumStock}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                登録
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                  商品コード {sortField === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  商品名 {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>ケースあたり数量</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('totalCases')}>
                  総ケース数 {sortField === 'totalCases' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('totalQuantity')}>
                  総在庫数 {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>保管場所</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.code}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.quantityPerCase}</TableCell>
                  <TableCell>{product.totalCases}</TableCell>
                  <TableCell>{product.totalQuantity}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.locations.map((loc, index) => (
                        <div key={index} className="text-sm">
                          {loc.column}列 {loc.position}番目 レベル{loc.level}: {loc.cases}ケース
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.totalQuantity < product.minimumStock ? (
                      <div className="flex items-center text-yellow-600">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">在庫不足</span>
                      </div>
                    ) : (
                      <span className="text-green-600 text-sm">適正</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleDeleteClick(product.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>商品情報の編集</DialogTitle>
            <DialogDescription>
              商品情報を編集してください
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>商品コード</Label>
                <div className="p-2 bg-gray-100 rounded-md">
                  {editingProduct.code}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">商品名</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editingProduct.name}
                  onChange={(e) => handleInputChange(e, true)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quantityPerCase">ケースあたりの数量</Label>
                <Input
                  id="edit-quantityPerCase"
                  name="quantityPerCase"
                  type="number"
                  min="1"
                  value={editingProduct.quantityPerCase}
                  onChange={(e) => handleInputChange(e, true)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-minimumStock">最小在庫数</Label>
                <Input
                  id="edit-minimumStock"
                  name="minimumStock"
                  type="number"
                  min="0"
                  value={editingProduct.minimumStock}
                  onChange={(e) => handleInputChange(e, true)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingProduct(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品の削除</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete && (
                <>
                  商品コード: {productToDelete}の商品を削除します。<br />
                  この操作は取り消せません。本当に削除しますか？
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setProductToDelete(null);
            }}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
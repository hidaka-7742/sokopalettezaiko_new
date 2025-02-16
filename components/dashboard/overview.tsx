"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { useProductStore } from "@/lib/store";

export function Overview() {
  const { products } = useProductStore();

  // 総商品数
  const totalProducts = products.length;

  // 在庫不足アラート数
  const lowStockAlerts = products.filter(
    product => product.totalQuantity < product.minimumStock
  ).length;

  // 本日の入出庫数（実際のアプリケーションでは日付ベースの集計が必要）
  const todayInbound = products.reduce((total, product) => {
    // この例では、最新の在庫変動を本日の数値として扱う
    return total + (product.totalCases > 0 ? 1 : 0);
  }, 0);

  const todayOutbound = products.reduce((total, product) => {
    // この例では、在庫が最小在庫数を下回っている商品を出庫として扱う
    return total + (product.totalQuantity < product.minimumStock ? 1 : 0);
  }, 0);

  // 総在庫数の計算
  const totalInventory = products.reduce((total, product) => {
    return total + product.totalQuantity;
  }, 0);

  // 先月比の計算（実際のアプリケーションでは履歴データが必要）
  // この例では、ダミーの増加率を表示
  const monthlyGrowth = "+5.2%";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総商品数</CardTitle>
          <Package className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            総在庫数: {totalInventory}
          </p>
          <p className="text-xs text-muted-foreground">
            先月比 {monthlyGrowth}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">入庫</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{todayInbound}</div>
          <p className="text-xs text-muted-foreground">
            {todayInbound}商品
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">出庫</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">-{todayOutbound}</div>
          <p className="text-xs text-muted-foreground">
            {todayOutbound}商品
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">在庫不足アラート</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lowStockAlerts}</div>
          <p className="text-xs text-muted-foreground">
            要補充商品
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
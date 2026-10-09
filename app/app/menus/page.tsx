'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { MenuAvailability } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  UtensilsCrossed,
  Plus,
  Loader2,
  BookOpen,
  FolderPlus,
  Coffee,
  Clock,
  AlertCircle,
} from 'lucide-react';

type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

const availabilityVariantMap: Record<
  MenuAvailability,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  available: 'default',
  unavailable: 'destructive',
  limited: 'secondary',
};

const availabilityLabelMap: Record<MenuAvailability, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  limited: 'Limited',
};

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MenusPage() {
  const { currentProperty, refresh } = useApp();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catName, setCatName] = useState('');
  const [catError, setCatError] = useState<string | null>(null);

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemAliases, setItemAliases] = useState('');
  const [itemAllergens, setItemAllergens] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('');
  const [itemAvailability, setItemAvailability] =
    useState<MenuAvailability>('available');

  const fetchData = useCallback(async () => {
    if (!currentProperty) {
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [catRes, itemRes] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('property_id', currentProperty.id)
        .order('display_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('*')
        .eq('property_id', currentProperty.id)
        .order('name', { ascending: true }),
    ]);

    if (catRes.error) {
      setError(catRes.error.message);
      setLoading(false);
      return;
    }
    if (itemRes.error) {
      setError(itemRes.error.message);
      setLoading(false);
      return;
    }

    setCategories((catRes.data ?? []) as MenuCategory[]);
    setItems((itemRes.data ?? []) as MenuItem[]);
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = map.get(item.category_id) ?? [];
      list.push(item);
      map.set(item.category_id, list);
    }
    return map;
  }, [items]);

  const resetCategoryForm = () => {
    setCatName('');
    setCatError(null);
  };

  const resetItemForm = () => {
    setItemName('');
    setItemDescription('');
    setItemPrice('');
    setItemCategoryId('');
    setItemAliases('');
    setItemAllergens('');
    setItemPrepTime('');
    setItemAvailability('available');
    setItemError(null);
  };

  const handleCreateCategory = async () => {
    if (!currentProperty) return;
    setCatError(null);
    if (!catName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    setCatSubmitting(true);
    const nextOrder =
      categories.length > 0
        ? Math.max(...categories.map((c) => c.display_order)) + 1
        : 0;

    const { error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        property_id: currentProperty.id,
        name: catName.trim(),
        display_order: nextOrder,
      });

    setCatSubmitting(false);
    if (insertError) {
      setCatError(insertError.message);
      return;
    }
    setCatDialogOpen(false);
    resetCategoryForm();
    refresh();
    fetchData();
  };

  const handleCreateItem = async () => {
    if (!currentProperty) return;
    setItemError(null);

    if (!itemName.trim()) {
      setItemError('Item name is required.');
      return;
    }
    if (!itemCategoryId) {
      setItemError('Please select a category.');
      return;
    }
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setItemError('Enter a valid price.');
      return;
    }
    const prepTime = itemPrepTime.trim() ? parseInt(itemPrepTime, 10) : 0;
    if (isNaN(prepTime) || prepTime < 0) {
      setItemError('Prep time must be a positive number.');
      return;
    }

    setItemSubmitting(true);
    const { error: insertError } = await supabase
      .from('menu_items')
      .insert({
        category_id: itemCategoryId,
        property_id: currentProperty.id,
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        price,
        availability: itemAvailability,
        spoken_aliases: splitCommaList(itemAliases),
        allergens: splitCommaList(itemAllergens),
        prep_time_minutes: prepTime,
      });

    setItemSubmitting(false);
    if (insertError) {
      setItemError(insertError.message);
      return;
    }
    setItemDialogOpen(false);
    resetItemForm();
    refresh();
    fetchData();
  };

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <UtensilsCrossed className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a property to manage its menu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage categories and items for {currentProperty.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={catDialogOpen}
            onOpenChange={(open) => {
              setCatDialogOpen(open);
              if (!open) resetCategoryForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
                <DialogDescription>
                  Create a new menu section, e.g. Starters, Mains, Beverages.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-name">Category name</Label>
                  <Input
                    id="cat-name"
                    placeholder="e.g. Main Course"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                  />
                </div>
                {catError && (
                  <p className="text-sm text-destructive">{catError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCatDialogOpen(false);
                    resetCategoryForm();
                  }}
                  disabled={catSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateCategory} disabled={catSubmitting}>
                  {catSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    'Add Category'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={itemDialogOpen}
            onOpenChange={(open) => {
              setItemDialogOpen(open);
              if (!open) resetItemForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add Menu Item</DialogTitle>
                <DialogDescription>
                  Add a new dish or product to your menu.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="item-category">Category</Label>
                  <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                    <SelectTrigger id="item-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No categories yet
                        </SelectItem>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">Name</Label>
                    <Input
                      id="item-name"
                      placeholder="e.g. Margherita Pizza"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-price">Price</Label>
                    <Input
                      id="item-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="item-description">Description</Label>
                  <Textarea
                    id="item-description"
                    placeholder="Short description shown to guests…"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-aliases">Spoken aliases</Label>
                    <Input
                      id="item-aliases"
                      placeholder="comma separated, e.g. margherita, cheese pizza"
                      value={itemAliases}
                      onChange={(e) => setItemAliases(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-allergens">Allergens</Label>
                    <Input
                      id="item-allergens"
                      placeholder="comma separated, e.g. gluten, dairy"
                      value={itemAllergens}
                      onChange={(e) => setItemAllergens(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-prep-time">Prep time (minutes)</Label>
                    <Input
                      id="item-prep-time"
                      type="number"
                      min="0"
                      placeholder="15"
                      value={itemPrepTime}
                      onChange={(e) => setItemPrepTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-availability">Availability</Label>
                    <Select
                      value={itemAvailability}
                      onValueChange={(v) =>
                        setItemAvailability(v as MenuAvailability)
                      }
                    >
                      <SelectTrigger id="item-availability">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {itemError && (
                  <p className="text-sm text-destructive">{itemError}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setItemDialogOpen(false);
                    resetItemForm();
                  }}
                  disabled={itemSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={itemSubmitting}>
                  {itemSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    'Add Item'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading menu…
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : categories.length === 0 && items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-medium mb-1">Your menu is empty</h3>
            <p className="text-sm text-muted-foreground">
              Start by adding a category, then add items to it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {items.length === 0 ? (
              <EmptyItemsState />
            ) : (
              <ItemsGrid
                items={items}
                currency={currentProperty.currency}
                categories={categories}
              />
            )}
          </TabsContent>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              {(itemsByCategory.get(cat.id) ?? []).length === 0 ? (
                <EmptyItemsState categoryName={cat.name} />
              ) : (
                <ItemsGrid
                  items={itemsByCategory.get(cat.id) ?? []}
                  currency={currentProperty.currency}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function ItemsGrid({
  items,
  currency,
  categories,
}: {
  items: MenuItem[];
  currency: string;
  categories?: MenuCategory[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => {
        const cat = categories?.find((c) => c.id === item.category_id);
        return (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-display leading-tight">
                  {item.name}
                </CardTitle>
                <Badge
                  variant={
                    availabilityVariantMap[item.availability] ?? 'secondary'
                  }
                  className="shrink-0"
                >
                  {availabilityLabelMap[item.availability]}
                </Badge>
              </div>
              {cat && (
                <p className="text-xs text-muted-foreground">{cat.name}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {item.description && (
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
              <div className="text-lg font-semibold">
                {formatCurrency(item.price, currency)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {item.prep_time_minutes > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.prep_time_minutes} min
                  </span>
                )}
              </div>
              {item.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.allergens.map((a) => (
                    <Badge key={a} variant="outline" className="text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
              {item.spoken_aliases.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.spoken_aliases.map((alias) => (
                    <Badge
                      key={alias}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      <Coffee className="w-3 h-3 mr-1" />
                      {alias}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function EmptyItemsState({ categoryName }: { categoryName?: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          {categoryName
            ? `No items in ${categoryName} yet.`
            : 'No items found.'}
        </p>
      </CardContent>
    </Card>
  );
}

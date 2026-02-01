"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { ClipboardCheck, Clock4, CheckCircle2, X, XCircle } from "lucide-react";
import { Brand, Model, Pedido, PedidoStatus, Product, ProductType, Supplier } from "@/types";
import {
  createPedido,
  createBrand,
  createModel,
  fetchBrands,
  fetchModels,
  fetchPedidoStatuses,
  fetchPedidos,
  fetchProductTypes,
  fetchProducts,
  fetchSuppliers,
  updatePedido
} from "@/lib/api";
import Alert from "@/components/ui/Alert";
import { formatMoneyFromNumber, formatMoneyInput, parseMoneyInput } from "@/utils/money";

const normalizePedidoEstado = (value?: string | null) => (value ?? "").trim().toLowerCase();
const isRecibidoPedidoEstado = (estado?: string | null) => {
  const normalized = normalizePedidoEstado(estado);
  return Boolean(normalized && normalized.includes("recib"));
};
const isCanceladoPedidoEstado = (estado?: string | null) => {
  const normalized = normalizePedidoEstado(estado);
  return Boolean(normalized && normalized.includes("cancel"));
};
const isPendientePedidoEstado = (estado?: string | null) => {
  const normalized = normalizePedidoEstado(estado);
  if (!normalized) return false;
  if (isRecibidoPedidoEstado(estado) || isCanceladoPedidoEstado(estado)) {
    return false;
  }
  return true;
};

const statusClasses: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  recibido: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-rose-100 text-rose-700"
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-DO");
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const getInitialPedidoForm = () => ({
  productTypeId: "",
  modelId: "",
  brandId: "",
  supplierId: "",
  cantidad: 1,
  fechaEsperada: "",
  precioCosto: ""
});

export default function PedidosPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [pedidoStatuses, setPedidoStatuses] = useState<PedidoStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"info" | "success" | "error">("info");
  const [form, setForm] = useState(getInitialPedidoForm);
  const [showFormModal, setShowFormModal] = useState(false);
  const [detailsPedido, setDetailsPedido] = useState<Pedido | null>(null);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [editForm, setEditForm] = useState({ fechaEsperada: "", estado: "", precioCosto: "" });
  const [newBrandName, setNewBrandName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [filterEstado, setFilterEstado] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRecibidos, setShowRecibidos] = useState(false);

  const showAlert = (text: string | null, variant: "info" | "success" | "error" = "info") => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pedidosData, productsData, suppliersData, typesData, brandsData, modelsData, statusesData] = await Promise.all([
        fetchPedidos(token),
        fetchProducts(token),
        fetchSuppliers(token),
        fetchProductTypes(token),
        fetchBrands(token),
        fetchModels(token),
        fetchPedidoStatuses(token)
      ]);
      setPedidos(pedidosData);
      setProducts(productsData);
      setSuppliers(suppliersData);
      setProductTypes(typesData);
      setBrands(brandsData);
      setModels(modelsData);
      setPedidoStatuses(statusesData);
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      void loadData();
    }
  }, [hydrated, token, loadData]);

  const normalizedRole = (role ?? "").toLowerCase();
  const isVendor = normalizedRole === "vendedor";
  const canRegisterCatalog = !isVendor;
  const canManage = role === "Administrador";

  useEffect(() => {
    if (canRegisterCatalog) {
      return;
    }
    setNewBrandName("");
    setNewModelName("");
  }, [canRegisterCatalog]);

  const stats = useMemo(() => {
    const pending = pedidos.filter((p) => isPendientePedidoEstado(p.estado)).length;
    const received = pedidos.filter((p) => isRecibidoPedidoEstado(p.estado)).length;
    const canceled = pedidos.filter((p) => isCanceladoPedidoEstado(p.estado)).length;
    const overdue = pedidos.filter(
      (p) => isPendientePedidoEstado(p.estado) && p.fechaEsperada && new Date(p.fechaEsperada) < new Date()
    ).length;

    return [
      { label: "Pendientes", value: pending.toString(), caption: "Por recibir", icon: ClipboardCheck },
      {
        label: "Recibidos",
        value: received.toString(),
        caption: "Últimos pedidos",
        icon: CheckCircle2,
        iconClassName: "bg-emerald-50 text-emerald-600"
      },
      {
        label: "Cancelados",
        value: canceled.toString(),
        caption: "Rechazados",
        icon: XCircle,
        iconClassName: "bg-rose-50 text-rose-600"
      },
      {
        label: "Pendientes vencidos",
        value: overdue.toString(),
        caption: "Fecha superada",
        icon: Clock4,
        iconClassName: "bg-amber-50 text-amber-600"
      }
    ];
  }, [pedidos]);

  const parsedPrecioCosto = useMemo(() => parseMoneyInput(form.precioCosto), [form.precioCosto]);

  const costoTotalEstimado = useMemo(() => {
    if (parsedPrecioCosto === null) {
      return null;
    }
    const total = parsedPrecioCosto * Math.max(0, form.cantidad);
    return Number.isFinite(total) ? total : null;
  }, [parsedPrecioCosto, form.cantidad]);

  const parsedEditPrecioCosto = useMemo(() => parseMoneyInput(editForm.precioCosto), [editForm.precioCosto]);

  const editCostoTotal = useMemo(() => {
    if (parsedEditPrecioCosto === null || !editingPedido) {
      return null;
    }
    const total = parsedEditPrecioCosto * editingPedido.cantidadSolicitada;
    return Number.isFinite(total) ? total : null;
  }, [parsedEditPrecioCosto, editingPedido]);

  const availableBrandsForType = useMemo(() => {
    if (!form.productTypeId) {
      return [];
    }
    return brands;
  }, [brands, form.productTypeId]);

  const availableModels = useMemo(() => {
    if (!form.productTypeId) {
      return [];
    }
    return models.filter((model) => {
      if (model.typeId !== form.productTypeId) {
        return false;
      }
      if (form.brandId && model.brandId !== form.brandId) {
        return false;
      }
      return true;
    });
  }, [models, form.productTypeId, form.brandId]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === form.modelId) ?? null,
    [models, form.modelId]
  );

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === form.brandId) ?? null,
    [brands, form.brandId]
  );

  const selectedProduct = useMemo(() => {
    if (!form.productTypeId || !form.brandId || !form.modelId) {
      return null;
    }
    return (
      products.find(
        (product) =>
          product.tipoId === form.productTypeId &&
          (product.marcaId ?? "") === form.brandId &&
          (product.modeloId ?? "") === form.modelId
      ) ?? null
    );
  }, [products, form.productTypeId, form.brandId, form.modelId]);

  const hasProductDefinition = useMemo(() => {
    const brandDraft = canRegisterCatalog ? newBrandName.trim() : "";
    const modelDraft = canRegisterCatalog ? newModelName.trim() : "";
    return Boolean(form.productTypeId && (form.brandId || brandDraft) && (form.modelId || modelDraft));
  }, [form.productTypeId, form.brandId, form.modelId, newBrandName, newModelName, canRegisterCatalog]);

  const productTypeOptions = useMemo(
    () => productTypes.map((type) => ({ value: type.id, label: type.nombre })),
    [productTypes]
  );

  const modelOptions = useMemo(
    () =>
      availableModels.map((model) => ({
        value: model.id,
        label: model.brandName ? `${model.nombre} • ${model.brandName}` : model.nombre
      })),
    [availableModels]
  );

  const brandOptions = useMemo(
    () => availableBrandsForType.map((brand) => ({ value: brand.id, label: brand.nombre })),
    [availableBrandsForType]
  );

  const supplierOptions = useMemo(
    () => suppliers.map((supplier) => ({ value: supplier.id, label: supplier.nombreEmpresa })),
    [suppliers]
  );

  const supplierOptionsWithAll = useMemo(
    () => [{ value: "", label: "Todos" }, ...supplierOptions],
    [supplierOptions]
  );

  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: `${product.nombre}${product.suplidor ? ` • ${product.suplidor}` : ""}` })),
    [products]
  );

  const productOptionsWithAll = useMemo(
    () => [{ value: "", label: "Todos" }, ...productOptions],
    [productOptions]
  );

  const activePedidoStatuses = useMemo(
    () => pedidoStatuses.filter((status) => status.activo),
    [pedidoStatuses]
  );

  const pedidoStatusOptions = useMemo(
    () => activePedidoStatuses.map((status) => ({ value: status.nombre, label: status.nombre })),
    [activePedidoStatuses]
  );

  const filterStatusOptions = useMemo(
    () => [{ value: "", label: "Todos" }, ...pedidoStatusOptions],
    [pedidoStatusOptions]
  );

  const filteredPedidos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return pedidos.filter((pedido) => {
      if (!showRecibidos && !filterEstado && isRecibidoPedidoEstado(pedido.estado)) {
        return false;
      }
      if (filterEstado && pedido.estado !== filterEstado) {
        return false;
      }
      if (filterSupplier && pedido.suplidorId !== filterSupplier) {
        return false;
      }
      if (filterProduct && pedido.productoId !== filterProduct) {
        return false;
      }
      if (normalizedSearch) {
        const target = `${pedido.producto} ${pedido.suplidor}`.toLowerCase();
        if (!target.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    });
  }, [pedidos, filterEstado, filterSupplier, filterProduct, searchTerm, showRecibidos]);

  const canSubmit = useMemo(() => {
    if (!form.productTypeId || !form.supplierId || form.cantidad <= 0) {
      return false;
    }
    if (selectedProduct) {
      return true;
    }
    return hasProductDefinition;
  }, [selectedProduct, form.productTypeId, form.supplierId, form.cantidad, hasProductDefinition]);

  useEffect(() => {
    if (!selectedModel) {
      return;
    }
    setForm((prev) => {
      if (prev.brandId === selectedModel.brandId) {
        return prev;
      }
      return { ...prev, brandId: selectedModel.brandId };
    });
  }, [selectedModel]);

  const openCreateModal = () => {
    setForm(getInitialPedidoForm());
    setNewBrandName("");
    setNewModelName("");
    setShowFormModal(true);
  };

  const closeCreateModal = () => {
    setForm(getInitialPedidoForm());
    setNewBrandName("");
    setNewModelName("");
    setShowFormModal(false);
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.productTypeId) {
      return showAlert("Selecciona un tipo de producto", "error");
    }
    if (!form.supplierId) {
      return showAlert("Selecciona un suplidor", "error");
    }
    if (form.cantidad <= 0) {
      return showAlert("La cantidad debe ser mayor a 0", "error");
    }
    const precioCostoValue = form.precioCosto ? parseMoneyInput(form.precioCosto) ?? undefined : undefined;
    if (form.precioCosto && precioCostoValue === undefined) {
      return showAlert("Ingresa un precio de costo válido (0 o mayor).", "error");
    }
    if (precioCostoValue !== undefined && precioCostoValue < 0) {
      return showAlert("Ingresa un precio de costo válido (0 o mayor).", "error");
    }
    setSaving(true);
    showAlert(null);
    try {
      const trimmedBrandInput = canRegisterCatalog ? newBrandName.trim() : "";
      const trimmedModelInput = canRegisterCatalog ? newModelName.trim() : "";
      let targetBrandId = form.brandId;
      let brandLabel = selectedBrand?.nombre ?? trimmedBrandInput;
      if (!targetBrandId && trimmedBrandInput && canRegisterCatalog) {
        const brand = await createBrand(token, { nombre: trimmedBrandInput });
        setBrands((prev) => [...prev, brand]);
        targetBrandId = brand.id;
        brandLabel = brand.nombre;
        setForm((prev) => ({ ...prev, brandId: brand.id }));
        setNewBrandName("");
      }
      if (!targetBrandId) {
        showAlert(canRegisterCatalog ? "Selecciona una marca o escribe una nueva" : "Selecciona una marca registrada", "error");
        return;
      }

      let targetModelId = form.modelId;
      let modelLabel = selectedModel?.nombre ?? trimmedModelInput;
      if (!targetModelId && trimmedModelInput && canRegisterCatalog) {
        const model = await createModel(token, {
          brandId: targetBrandId,
          typeId: form.productTypeId,
          nombre: trimmedModelInput
        });
        setModels((prev) => [...prev, model]);
        targetModelId = model.id;
        modelLabel = model.nombre;
        setForm((prev) => ({ ...prev, modelId: model.id }));
        setNewModelName("");
      }
      if (!targetModelId) {
        showAlert(
          canRegisterCatalog ? "Selecciona un modelo o escribe uno nuevo" : "Selecciona un modelo registrado",
          "error"
        );
        return;
      }

      let productMatch =
        products.find(
          (product) =>
            product.tipoId === form.productTypeId &&
            (product.marcaId ?? "") === targetBrandId &&
            (product.modeloId ?? "") === targetModelId
        ) ?? null;

      const typeInfo = productTypes.find((type) => type.id === form.productTypeId);
      const autoName =
        productMatch?.nombre ||
        [brandLabel, modelLabel].filter((value) => value && value.length > 0).join(" ") ||
        typeInfo?.nombre ||
        "Producto pendiente";
      await createPedido(token, {
        productId: productMatch?.id,
        supplierId: form.supplierId,
        cantidadSolicitada: form.cantidad,
        fechaEsperada: form.fechaEsperada || undefined,
        productTypeId: form.productTypeId,
        brandId: targetBrandId,
        modelId: targetModelId,
        productNameHint: autoName,
        precioCosto: precioCostoValue
      });
      setForm(getInitialPedidoForm());
      setNewBrandName("");
      setNewModelName("");
      setShowFormModal(false);
      showAlert("Pedido registrado correctamente", "success");
      await loadData();
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!token || !editingPedido) return;
    if (!editForm.estado) {
      showAlert("Selecciona el estado del pedido", "error");
      return;
    }
    setEditSaving(true);
    showAlert(null);
    const precioCostoValue = (() => {
      const raw = editForm.precioCosto.trim();
      if (!raw) {
        return null;
      }
      const parsed = parseMoneyInput(raw);
      if (parsed === null || !Number.isFinite(parsed)) {
        return undefined;
      }
      return parsed < 0 ? undefined : parsed;
    })();

    if (precioCostoValue === undefined) {
      showAlert("Ingresa un precio de costo válido (0 o mayor).", "error");
      setEditSaving(false);
      return;
    }

    try {
      await updatePedido(token, editingPedido.id, {
        fechaEsperada: editForm.fechaEsperada || null,
        estado: editForm.estado,
        precioCosto: precioCostoValue
      });
      showAlert("Pedido actualizado", "success");
      setEditingPedido(null);
      setEditForm({ fechaEsperada: "", estado: "", precioCosto: "" });
      await loadData();
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setEditSaving(false);
    }
  };

  const closeDetailsModal = () => setDetailsPedido(null);
  const closeEditModal = () => {
    setEditingPedido(null);
    setEditForm({ fechaEsperada: "", estado: "", precioCosto: "" });
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Pedidos">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onDismiss={() => showAlert(null)}>
            {message}
          </Alert>
        </div>
      )}
      <StatsGrid stats={stats} />
      {canManage && (
        <div className="mt-6 flex justify-end">
          <Button variant="accent" onClick={openCreateModal}>
            Crear pedido
          </Button>
        </div>
      )}

      {canManage && showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Nuevo pedido</p>
                <h2 className="text-xl font-semibold text-slate-900">Crear pedido</h2>
                <p className="text-sm text-slate-500">
                  Solicita reposición seleccionando tipo de producto, modelo, marca y suplidor.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeCreateModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-slate-400">Tipo de producto</label>
                <SearchableSelect
                  value={form.productTypeId}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      productTypeId: value,
                      brandId: "",
                      modelId: ""
                    }))
                  }
                  options={productTypeOptions}
                  placeholder="Selecciona tipo"
                  searchPlaceholder="Buscar tipo"
                  disabled={!productTypeOptions.length}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Modelo</label>
                <div className="space-y-2">
                  <SearchableSelect
                    value={form.modelId}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        modelId: value,
                        ...(value ? {} : { brandId: "" })
                      }))
                    }
                    options={modelOptions}
                    placeholder={
                      !form.productTypeId
                        ? "Primero elige un tipo"
                        : modelOptions.length
                          ? "Selecciona modelo"
                          : "Sin modelos disponibles"
                    }
                    searchPlaceholder="Buscar modelo"
                    disabled={!form.productTypeId || modelOptions.length === 0}
                  />
                  {canRegisterCatalog ? (
                    <Input
                      placeholder="Nuevo modelo (se registrará al guardar)"
                      value={newModelName}
                      onChange={(event) => setNewModelName(event.target.value)}
                      disabled={!form.productTypeId}
                    />
                  ) : (
                    <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                      Solo un administrador puede registrar modelos nuevos.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Marca</label>
                <div className="space-y-2">
                  <SearchableSelect
                    value={form.brandId}
                    onChange={(value) => {
                      setForm((prev) => {
                        if (!value) {
                          return { ...prev, brandId: "", modelId: "" };
                        }
                        const currentModel = models.find((model) => model.id === prev.modelId);
                        const shouldResetModel = currentModel ? currentModel.brandId !== value : false;
                        return {
                          ...prev,
                          brandId: value,
                          modelId: shouldResetModel ? "" : prev.modelId
                        };
                      });
                    }}
                    options={brandOptions}
                    placeholder={!form.productTypeId ? "Primero elige un tipo" : "Selecciona marca"}
                    searchPlaceholder="Buscar marca"
                    disabled={!form.productTypeId || brandOptions.length === 0}
                  />
                  {canRegisterCatalog ? (
                    <Input
                      placeholder="Nueva marca (se registrará al guardar)"
                      value={newBrandName}
                      onChange={(event) => setNewBrandName(event.target.value)}
                      disabled={!form.productTypeId}
                    />
                  ) : (
                    <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                      Los vendedores no pueden crear marcas nuevas. Selecciona una opción existente.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Suplidor</label>
                <SearchableSelect
                  value={form.supplierId}
                  onChange={(value) => setForm((prev) => ({ ...prev, supplierId: value }))}
                  options={supplierOptions}
                  placeholder="Selecciona suplidor"
                  searchPlaceholder="Buscar suplidor"
                  disabled={!supplierOptions.length}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Precio de costo</label>
                <div className="space-y-1">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      RD$
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ej. 1,250.00"
                      value={form.precioCosto}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          precioCosto: formatMoneyInput(event.target.value)
                        }))
                      }
                      className="pl-14"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {costoTotalEstimado !== null
                      ? `Total estimado: RD$ ${currencyFormatter.format(costoTotalEstimado)}`
                      : "Ingresa el costo unitario para estimar el total."}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Cantidad</label>
                <Input
                  type="number"
                  min={1}
                  value={form.cantidad}
                  onChange={(e) => setForm((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Fecha esperada</label>
                <Input
                  type="date"
                  value={form.fechaEsperada}
                  onChange={(e) => setForm((prev) => ({ ...prev, fechaEsperada: e.target.value }))}
                />
              </div>
            </div>
            {form.productTypeId && (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedProduct ? (
                  <>
                    Producto detectado:{" "}
                    <span className="font-medium text-slate-800">{selectedProduct.nombre}</span>
                    {selectedBrand ? ` • ${selectedBrand.nombre}` : ""}
                  </>
                ) : hasProductDefinition ? (
                  "No encontramos un producto con esta combinación. Lo registraremos automáticamente cuando marques el pedido como recibido."
                ) : (
                  canRegisterCatalog
                    ? "Selecciona o escribe una marca y modelo para poder crear el producto del pedido."
                    : "Selecciona una marca y modelo registrados para poder crear el producto del pedido."
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeCreateModal}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} variant="accent" disabled={saving || !canSubmit}>
                {saving ? "Guardando..." : "Registrar pedido"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pedidos registrados</h2>
            <p className="text-sm text-slate-500">Últimos movimientos de compra realizados por el equipo.</p>
          </div>
          <Button variant="subtle" onClick={() => void loadData()} className="text-slate-600">
            Actualizar lista
          </Button>
        </div>
        <div className="mb-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs uppercase text-slate-400">Estado</label>
            <SearchableSelect
              value={filterEstado}
              onChange={(value) => {
                setFilterEstado(value);
                if (value === "recibido") {
                  setShowRecibidos(true);
                }
              }}
              options={filterStatusOptions}
              placeholder="Todos"
              searchPlaceholder="Buscar estado"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400">Producto</label>
            <SearchableSelect
              value={filterProduct}
              onChange={(value) => setFilterProduct(value)}
              options={productOptionsWithAll}
              placeholder="Todos"
              searchPlaceholder="Buscar producto"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400">Suplidor</label>
            <SearchableSelect
              value={filterSupplier}
              onChange={(value) => setFilterSupplier(value)}
              options={supplierOptionsWithAll}
              placeholder="Todos"
              searchPlaceholder="Buscar suplidor"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400">Búsqueda manual</label>
            <Input
              placeholder="Producto o suplidor"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="text-xs uppercase text-slate-400">Mostrar recibidos</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={showRecibidos}
                onChange={(event) => setShowRecibidos(event.target.checked)}
              />
              <span className="text-sm text-slate-600">Incluir completados</span>
            </div>
            {(filterEstado || filterSupplier || filterProduct || searchTerm || showRecibidos) && (
              <Button
                variant="subtle"
                className="text-xs text-slate-500"
                onClick={() => {
                  setFilterEstado("");
                  setFilterSupplier("");
                  setFilterProduct("");
                  setSearchTerm("");
                  setShowRecibidos(false);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando pedidos...</p>
        ) : filteredPedidos.length === 0 ? (
          <p className="text-sm text-slate-400">No hay pedidos que coincidan con los filtros seleccionados.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Suplidor</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Precio unitario</th>
                  <th className="px-4 py-2">Total pedido</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Esperado</th>
                  <th className="px-4 py-2">Recibido</th>
                  <th className="px-4 py-2">Solicitud</th>
                  <th className="px-4 py-2">Solicitado por</th>
                  {canManage && <th className="px-4 py-2 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{pedido.producto}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.suplidor}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.cantidadSolicitada}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {pedido.precioCosto !== null && pedido.precioCosto !== undefined
                        ? `RD$ ${currencyFormatter.format(pedido.precioCosto)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {pedido.precioCosto !== null && pedido.precioCosto !== undefined
                        ? `RD$ ${currencyFormatter.format(pedido.precioCosto * pedido.cantidadSolicitada)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[pedido.estado] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaEsperada)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaRecibido)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(pedido.fechaPedido)}</td>
                    <td className="px-4 py-2 text-slate-600">{pedido.solicitadoPor ?? "—"}</td>
                    {canManage && (
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-3">
                          <Button
                            variant="subtle"
                            className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                            onClick={() => setDetailsPedido(pedido)}
                          >
                            Detalles
                          </Button>
                          <Button
                            variant="subtle"
                            className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                            onClick={() => {
                          setEditingPedido(pedido);
                          setEditForm({
                            fechaEsperada: pedido.fechaEsperada ?? "",
                            estado: pedido.estado,
                            precioCosto: formatMoneyFromNumber(pedido.precioCosto)
                          });
                        }}
                      >
                        Editar
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {detailsPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Detalles del pedido</p>
                <h2 className="text-xl font-semibold text-slate-900">{detailsPedido.producto}</h2>
                <p className="text-sm text-slate-500">Solicitado a {detailsPedido.suplidor}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeDetailsModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Cantidad:</span> {detailsPedido.cantidadSolicitada}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Precio de costo:</span>{" "}
                {detailsPedido.precioCosto !== null && detailsPedido.precioCosto !== undefined
                  ? `RD$ ${currencyFormatter.format(detailsPedido.precioCosto)}`
                  : "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Total pedido:</span>{" "}
                {detailsPedido.precioCosto !== null && detailsPedido.precioCosto !== undefined
                  ? `RD$ ${currencyFormatter.format(detailsPedido.precioCosto * detailsPedido.cantidadSolicitada)}`
                  : "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Estado:</span>{" "}
                <span className="capitalize">{detailsPedido.estado}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-800">Fecha esperada:</span>{" "}
                {formatDate(detailsPedido.fechaEsperada)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Fecha recibida:</span>{" "}
                {formatDate(detailsPedido.fechaRecibido)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Fecha de solicitud:</span>{" "}
                {formatDate(detailsPedido.fechaPedido)}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Solicitado por:</span>{" "}
                {detailsPedido.solicitadoPor ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}
      {editingPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Editar pedido</p>
                <h2 className="text-xl font-semibold text-slate-900">{editingPedido.producto}</h2>
                <p className="text-sm text-slate-500">Realizado a {editingPedido.suplidor}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeEditModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-slate-400">Fecha esperada</label>
                <Input
                  type="date"
                  value={editForm.fechaEsperada}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, fechaEsperada: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-400">Estado</label>
                <SearchableSelect
                  value={editForm.estado}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, estado: value }))}
                  options={pedidoStatusOptions}
                  placeholder="Selecciona estado"
                  searchPlaceholder="Buscar estado"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs uppercase text-slate-400">Precio de costo</label>
              <div className="space-y-1">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    RD$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej. 1,250.00"
                    value={editForm.precioCosto}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        precioCosto: formatMoneyInput(event.target.value)
                      }))
                    }
                    className="pl-14"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {editCostoTotal !== null
                    ? `Total actual del pedido: RD$ ${currencyFormatter.format(editCostoTotal)}`
                    : `Cantidad solicitada: ${editingPedido?.cantidadSolicitada ?? "0"} unidades.`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeEditModal}>
                Cancelar
              </Button>
              <Button variant="accent" onClick={() => void handleEditSubmit()} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Actualizar pedido"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

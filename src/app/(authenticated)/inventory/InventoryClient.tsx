"use client";

import React, { useState } from "react";
import { Plus, Sliders } from "lucide-react";
import { Modal } from "@/ui/core/Modal";
import { Button } from "@/ui/core/Button";
import { StockAdjustmentForm } from "@/features/inventory/components/StockAdjustmentForm";

export function InventoryClient({ products }: { products: any[] }) {
    const [isAdjusting, setIsAdjusting] = useState(false);

    return (
        <>
            <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsAdjusting(true)}
                className="w-full sm:w-auto italic shadow-xl shadow-accent-500/20 whitespace-nowrap flex items-center justify-center gap-2"
            >
                <Sliders className="w-5 h-5 mr-1" />
                <span>Adjust Stock</span>
            </Button>

            <Modal
                isOpen={isAdjusting}
                onClose={() => setIsAdjusting(false)}
                maxWidth="max-w-xl"
            >
                <StockAdjustmentForm
                    products={products}
                    onSuccess={() => setIsAdjusting(false)}
                />
            </Modal>
        </>
    );
}

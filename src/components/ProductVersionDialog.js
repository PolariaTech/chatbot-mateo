"use client";

import { createElement } from "react";
import {
  ETIQUETA_ACEPTAR_NUEVA_VERSION,
  MENSAJE_NUEVA_VERSION_PRODUCTO,
  TITULO_NUEVA_VERSION_PRODUCTO,
} from "../lib/product-version-constants";

export default function ProductVersionDialog({
  titleId,
  descriptionId,
  accepting,
  onAccept,
}) {
  return createElement(
    "div",
    { className: "product-version-gate", role: "presentation" },
    createElement("div", {
      className: "product-version-gate__fondo",
      "aria-hidden": "true",
    }),
    createElement(
      "div",
      {
        role: "alertdialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        "aria-describedby": descriptionId,
        className: "product-version-gate__dialogo",
      },
      createElement(
        "h2",
        { id: titleId, className: "product-version-gate__titulo" },
        TITULO_NUEVA_VERSION_PRODUCTO,
      ),
      createElement(
        "p",
        { id: descriptionId, className: "product-version-gate__mensaje" },
        MENSAJE_NUEVA_VERSION_PRODUCTO,
      ),
      createElement(
        "div",
        { className: "product-version-gate__acciones" },
        createElement(
          "button",
          {
            type: "button",
            disabled: accepting,
            onClick: onAccept,
            className: "product-version-gate__aceptar",
          },
          ETIQUETA_ACEPTAR_NUEVA_VERSION,
        ),
      ),
    ),
  );
}

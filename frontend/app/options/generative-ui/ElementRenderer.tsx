'use client';

import React from 'react';
import { GenericElement, allowedTags, svgTags, allowedProps } from './utils';

export function renderGenericElement(
  el: GenericElement, 
  key: string | number, 
  onClick?: () => void
): React.ReactNode {
  const { tag, type, className, class: classProp, children, text, content, props, ...rest } = el;
  const elementTag = tag || type;
  
  if (!elementTag) {
    const textContent = String(text || content || '');
    if (onClick) {
      return (
        <div key={key} onClick={onClick} className="relative inline-block cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500">
          {textContent}
        </div>
      );
    }
    return <span key={key}>{textContent}</span>;
  }
  
  const Tag = elementTag as React.ElementType;
  const isSvgTag = svgTags.includes(elementTag);
  
  if (!allowedTags.includes(elementTag)) {
    return <span key={key} className="text-red-500">Unknown tag: {elementTag}</span>;
  }
  
  const finalClassName = className || classProp;
  
  const allProps: Record<string, unknown> = {};
  
  if (props && typeof props === 'object') {
    for (const [k, v] of Object.entries(props)) {
      if (allowedProps.includes(k)) {
        allProps[k] = v;
      }
    }
  }
  
  const knownDirectProps = ['type', 'placeholder', 'required', 'disabled', 'checked', 'value', 'name', 'id', 'href', 'src', 'alt', 'title', 'for', 'method', 'action'];
  for (const k of knownDirectProps) {
    if (k in el && typeof el[k] === 'string') {
      allProps[k] = el[k];
    }
    if (k in el && typeof el[k] === 'boolean') {
      allProps[k] = el[k];
    }
  }
  
  if (isSvgTag) {
    for (const [k, v] of Object.entries(el)) {
      if (!['tag', 'type', 'className', 'class', 'children', 'text', 'content', 'props'].includes(k)) {
        allProps[k] = v;
      }
    }
  }
  
  let contentNode: React.ReactNode = null;
  const childContent = children || text || content;
  if (typeof childContent === 'string') {
    contentNode = childContent;
  } else if (Array.isArray(childContent)) {
    contentNode = childContent.map((child, index) => renderGenericElement(child, index, onClick));
  }
  
  const element = React.createElement(Tag, { className: finalClassName, ...allProps }, contentNode);
  
  if (onClick) {
    return (
      <div key={key} onClick={onClick} className="relative inline-block cursor-pointer hover:outline hover:outline-2 hover:outline-blue-500">
        {element}
      </div>
    );
  }
  
  return element;
}

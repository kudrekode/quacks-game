import React, { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { EffectChoiceModel } from "./effectChoices.js";
import { GameIcon } from "./GameIcon.js";
import { ingredientAsset } from "./uiAssets.js";

interface EffectChoiceModalProps {
  decisionId: string;
  model: EffectChoiceModel;
  reducedMotion: boolean;
  onConfirm: (choice: string) => void;
  onCancel?: () => void;
}

export function EffectChoiceModal({decisionId,model,reducedMotion,onConfirm,onCancel}:EffectChoiceModalProps) {
  const [selectedChoice,setSelectedChoice]=useState<string|undefined>(model.initialChoice);
  const [resolving,setResolving]=useState(model.debugConfirming);
  const dialogRef=useRef<HTMLElement>(null);
  const choiceRefs=useRef(new Map<string,HTMLButtonElement>());
  const legalChoices=useMemo(()=>model.choices.filter(choice=>!choice.disabledReason),[model.choices]);
  const selected=model.choices.find(choice=>choice.id===selectedChoice);

  useEffect(()=>{document.body.classList.add("effect-choice-open");return()=>document.body.classList.remove("effect-choice-open")},[]);
  useEffect(()=>{setSelectedChoice(model.initialChoice);setResolving(model.debugConfirming)},[decisionId,model.initialChoice,model.debugConfirming]);
  useEffect(()=>{const target=(model.initialChoice&&choiceRefs.current.get(model.initialChoice))||choiceRefs.current.get(legalChoices[0]?.id??"");target?.focus()},[decisionId]);

  const confirm=()=>{
    if(!selectedChoice||selected?.disabledReason||resolving)return;
    setResolving(true);
    window.setTimeout(()=>onConfirm(selectedChoice),reducedMotion?0:320);
  };
  const choose=(id:string)=>{if(resolving)return;setSelectedChoice(current=>current===id?undefined:id)};
  const navigate=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(!["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Home","End"].includes(event.key))return;
    event.preventDefault();
    const current=Math.max(0,legalChoices.findIndex(choice=>choice.id===selectedChoice));
    const index=event.key==="Home"?0:event.key==="End"?legalChoices.length-1:(current+(event.key==="ArrowLeft"||event.key==="ArrowUp"?-1:1)+legalChoices.length)%legalChoices.length;
    const next=legalChoices[index];if(next){setSelectedChoice(next.id);choiceRefs.current.get(next.id)?.focus()}
  };
  const trapFocus=(event:KeyboardEvent<HTMLElement>)=>{
    if(event.key==="Escape"&&model.allowCancel&&onCancel){event.preventDefault();onCancel();return}
    if(event.key!=="Tab"||!dialogRef.current)return;
    const focusable=[...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  };

  return <div className={`effect-choice-backdrop${resolving?" is-resolving":""}`}>
    <section ref={dialogRef} className={`effect-choice-modal choice-type-${model.type.toLowerCase()}${model.debugConfirming?" is-debug-confirming":""}`} role="dialog" aria-modal="true" aria-labelledby="effect-choice-title" aria-describedby="effect-choice-description" onKeyDown={trapFocus}>
      <header className="effect-choice-header"><div className="effect-source-icon"><GameIcon name={model.source==="Fortune card"?"fortune":"spark"} size={34}/></div><div><span className="eyebrow">{model.source}</span><h1 id="effect-choice-title">{model.title}</h1><p id="effect-choice-description">{model.description}</p></div></header>
      <div className="effect-choice-list" role="radiogroup" aria-label="Legal choices" onKeyDown={navigate}>{model.choices.map((choice,index)=>{
        const isSelected=choice.id===selectedChoice;const unselectedReturning=resolving&&model.type==="TOKEN_CHOICE"&&Boolean(choice.token)&&!isSelected;
        return <button key={choice.id} ref={node=>{if(node)choiceRefs.current.set(choice.id,node);else choiceRefs.current.delete(choice.id)}} type="button" role="radio" aria-checked={isSelected} disabled={Boolean(choice.disabledReason)||resolving} className={`effect-choice-option${choice.token?" has-token":""}${isSelected?" is-selected":""}${choice.disabledReason?" is-illegal":""}${resolving&&isSelected?" is-confirming":""}${(resolving&&isSelected&&choice.returnsToBag)||unselectedReturning?" is-returning":""}${resolving&&isSelected&&choice.movesToBoard?" is-placing":""}`} style={{"--choice-order":index} as CSSProperties} onClick={()=>choose(choice.id)}>
          {choice.token&&<span className="effect-token"><img src={ingredientAsset(choice.token.color,choice.token.value)} alt=""/><b>{choice.token.value}</b></span>}
          <span className="effect-choice-copy"><b>{choice.label}</b><small>{choice.disabledReason??choice.description}</small></span>
          <i aria-hidden="true">{choice.disabledReason?"Unavailable":isSelected?"Selected":"Choose"}</i>
        </button>})}</div>
      <div className="effect-choice-summary" aria-live="polite"><span className="eyebrow">Selected</span>{selected?<><b>{selected.label}</b><small>Choose it again to undo the selection.</small></>:<><b>No choice selected</b><small>Select one legal option to continue.</small></>}</div>
      <p className="effect-after"><GameIcon name="round" size={20}/>{model.afterChoosing}</p>
      <footer className="effect-choice-actions"><span className="effect-bag-target" aria-hidden="true"><GameIcon name="bag" size={26}/>Returned ingredients rejoin the live bag</span>{model.allowCancel&&onCancel&&<button className="button-secondary" onClick={onCancel} disabled={resolving}>Cancel</button>}<button className="button-primary" onClick={confirm} disabled={!selectedChoice||Boolean(selected?.disabledReason)||resolving}>{resolving?"Resolving effect...":model.confirmLabel}</button></footer>
    </section>
  </div>;
}

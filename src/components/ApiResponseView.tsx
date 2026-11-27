type ApiRecord = Record<string,unknown>;

function isApiRecord(value:unknown):value is ApiRecord{
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function apiText(value:unknown){
  return typeof value==="string"||typeof value==="number"?String(value):"";
}
function apiFieldLabel(key:string){
  return key.replace(/([a-z0-9])([A-Z])/g,"$1 $2")
    .replace(/[_-]+/g," ")
    .replace(/\s+/g," ")
    .trim()
    .replace(/\b[a-z]/g,letter=>letter.toUpperCase());
}
function apiItemTitle(value:ApiRecord,index:number){
  return apiText(value.name)||apiText(value.title)||apiText(value.tag)||apiText(value.id)||apiText(value.key)||"Record "+(index+1);
}
function ApiScalar({value}:{value:unknown}){
  if(value===null||value===undefined)return <span className="ri-api-null">—</span>;
  if(typeof value==="boolean")return <span className={"ri-api-boolean "+(value?"is-true":"is-false")}>{value?"Yes":"No"}</span>;
  return <span className="ri-api-scalar">{String(value)}</span>;
}
function ApiCell({value}:{value:unknown}){
  if(isApiRecord(value)||Array.isArray(value)){
    const count=Array.isArray(value)?value.length:Object.keys(value).length;
    const label=Array.isArray(value)?count+" items":count+" fields";
    return <details className="ri-api-cell-details">
      <summary>{label}</summary>
      <ApiValue value={value}/>
    </details>;
  }
  return <ApiScalar value={value}/>;
}
function ApiObjectTable({rows}:{rows:ApiRecord[]}){
  const columns=Array.from(new Set(rows.flatMap(row=>Object.keys(row))));
  if(!columns.length)return <div className="ri-api-empty">No fields returned.</div>;
  return <div className="ri-api-table-wrap">
    <table className="ri-api-table">
      <thead><tr>{columns.map(key=><th key={key}>{apiFieldLabel(key)}</th>)}</tr></thead>
      <tbody>{rows.map((row,index)=><tr key={(apiText(row.tag)||apiText(row.id)||"record")+":"+index}>
        {columns.map(key=><td key={key}><ApiCell value={row[key]}/></td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}
function ApiObjectFields({value}:{value:ApiRecord}){
  const entries=Object.entries(value);
  if(!entries.length)return <div className="ri-api-empty">No fields returned.</div>;
  const scalar=entries.filter(([,field])=>!isApiRecord(field)&&!Array.isArray(field));
  const nested=entries.filter(([,field])=>isApiRecord(field)||Array.isArray(field));
  return <div className="ri-api-object-fields">
    {scalar.length>0&&<div className="ri-api-field-grid">
      {scalar.map(([key,field])=><div className="ri-api-field" key={key}>
        <span className="ri-api-field-label">{apiFieldLabel(key)}</span>
        <ApiScalar value={field}/>
      </div>)}
    </div>}
    {nested.map(([key,field])=><section className="ri-api-nested-field" key={key}>
      <header><strong>{apiFieldLabel(key)}</strong>
        <small>{Array.isArray(field)?field.length+" items":"Object"}</small></header>
      <ApiValue value={field}/>
    </section>)}
  </div>;
}
function ApiValue({value}:{value:unknown}){
  if(Array.isArray(value)){
    if(!value.length)return <div className="ri-api-empty">No items returned.</div>;
    if(value.every(isApiRecord))return <ApiObjectTable rows={value}/>;
    if(value.some(isApiRecord)){
      return <div className="ri-api-record-cards">{value.map((item,index)=>
        <article className="ri-api-record-card" key={index}>
          {isApiRecord(item)?<><strong>{apiItemTitle(item,index)}</strong><ApiObjectFields value={item}/></>
            :<ApiScalar value={item}/>}
        </article>)}</div>;
    }
    return <div className="ri-api-chip-list">{value.map((item,index)=>
      <span className="ri-api-chip" key={index}><ApiScalar value={item}/></span>)}</div>;
  }
  if(isApiRecord(value))return <ApiObjectFields value={value}/>;
  return <ApiScalar value={value}/>;
}
export function ApiResponseView({value}:{value:unknown}){
  const object=isApiRecord(value)?value:{};
  const list=Array.isArray(value)?value:Array.isArray(object.items)?object.items:null;
  if(list){
    const metadata=Array.isArray(value)?{}:Object.fromEntries(Object.entries(object).filter(([key])=>key!=="items"));
    return <div className="ri-api-response">
      <div className="ri-api-response-count">{list.length} {list.length===1?"record":"records"} returned</div>
      {Object.keys(metadata).length>0&&<ApiObjectFields value={metadata}/>}
      <ApiValue value={list}/>
    </div>;
  }
  if(isApiRecord(value))return <div className="ri-api-response"><ApiObjectFields value={value}/></div>;
  return <div className="ri-api-response"><ApiScalar value={value}/></div>;
}

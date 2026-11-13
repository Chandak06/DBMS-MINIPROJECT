"""Audit submitted text and document contents without printing credential values."""
from pathlib import Path
import argparse,json,re,zipfile,io
from datetime import datetime,timezone
from urllib.parse import urlsplit,unquote
from xml.etree import ElementTree
from pypdf import PdfReader
ROOT=Path.cwd()
ROOT_FILES=[".env.example",".gitignore","README.md","package.json","package-lock.json","tsconfig.json","next-env.d.ts","next.config.mjs","vitest.config.ts","middleware.ts"]
DIRS=["app","components","lib","database","scripts","tests","docs"]
EXCLUDED_DIRS={".git","node_modules",".next",".next-dev","__pycache__","coverage"}
def selected_files():
    for name in ROOT_FILES:
        yield Path(name)
    for d in DIRS:
        for p in Path(d).rglob("*"):
            if not p.is_file() or any(x in EXCLUDED_DIRS for x in p.parts):continue
            if p.name.startswith(".env") or p.suffix in {".pyc",".tsbuildinfo",".tmp",".bak"}:continue
            if p.suffix==".log" and not p.as_posix().startswith("docs/testing/results/"):continue
            yield p
def local_credentials():
    env={}
    for line in (ROOT/".env.local").read_text(encoding="utf-8-sig").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:continue
        k,v=line.split("=",1);env[k.strip()]=v.strip().strip("'\"")
    secrets=[]
    for key in env:
        if not re.search(r"PASSWORD|SECRET|TOKEN|CLIENT_ID",key,re.I):continue
        value=env.get(key,"")
        if value and not re.match(r"^(your_|replace_)",value):secrets.append((key,value))
    uri=env.get("MONGODB_URI","")
    if uri:
        password=urlsplit(uri).password
        if password:secrets.extend([("MONGODB_URI_PASSWORD",unquote(password)),("MONGODB_ENCODED_PASSWORD",password),("MONGODB_URI",uri)])
    return secrets
def text_from(name,data):
    ext=Path(name).suffix.lower()
    if ext==".docx":
        texts=[]
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for part in z.namelist():
                if part.endswith(".xml"):
                    raw=z.read(part).decode("utf-8");texts.append(raw)
                    try:texts.append("".join(ElementTree.fromstring(raw).itertext()))
                    except ElementTree.ParseError:pass
        return "\n".join(texts)
    if ext==".pdf":return "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(data)).pages)
    if ext in {".png",".jpg",".jpeg",".gif",".ico"}:return None
    try:return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        if ext in {".md",".txt",".csv",".log"}:return data.decode("cp1252")
        return None
def audit(entries,secrets):
    findings=[];scanned=0;documents=0;envfiles=[]
    for name,data in entries:
        if Path(name).name.startswith(".env"):
            envfiles.append(name)
            if name!=".env.example":findings.append({"path":name,"reason":"real environment file"})
        text=text_from(name,data)
        if text is None:continue
        scanned+=1;documents+=Path(name).suffix.lower() in {".pdf",".docx"}
        for key,value in secrets:
            if len(value)>=8:
                hit=value in text or re.sub(r"\s+","",value) in re.sub(r"\s+","",text)
            else:
                hit=bool(re.search(r"(?:password|secret|MYSQL_PASSWORD)\s*[:=]\s*['\"]?"+re.escape(value)+r"(?:['\"\s,}]|$)",text,re.I))
            if hit:findings.append({"path":name,"reason":"configured credential value","key":key})
        if re.search(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",text):
            findings.append({"path":name,"reason":"private key block"})
        if re.search(r"\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AIza[A-Za-z0-9_-]{30,})\b",text):
            findings.append({"path":name,"reason":"credential token pattern"})
    return {"status":"PASS" if not findings else "FAIL","textFilesScanned":scanned,"documentsExtracted":documents,"environmentFiles":envfiles,"findings":findings,"credentialValuesPrinted":False}
def main():
    parser=argparse.ArgumentParser();parser.add_argument("--archive");parser.add_argument("--output",default="docs/testing/results/current/secret-scan.json");args=parser.parse_args()
    if args.archive:
        with zipfile.ZipFile(args.archive) as archive:entries=[(name,archive.read(name)) for name in archive.namelist() if not name.endswith("/")]
    else:entries=[(p.as_posix(),p.read_bytes()) for p in selected_files()]
    result={"checkedAt":datetime.now(timezone.utc).isoformat(),"scope":"source and extracted documents",**audit(entries,local_credentials())}
    dest=ROOT/args.output;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({key:result[key] for key in ["status","textFilesScanned","documentsExtracted","findings"]}))
    raise SystemExit(0 if result["status"]=="PASS" else 1)
if __name__=="__main__":main()

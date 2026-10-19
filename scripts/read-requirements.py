from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import json
root=Path.cwd()
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
paths=[root/"docs/requirements/DBMS_Level_3_Requirements_Draft.docx",root/"docs/design/Relational_Schema.docx"]
out=root/"artifacts/local/submission-cleanup";out.mkdir(parents=True,exist_ok=True)
for p in paths:
    with ZipFile(p) as z: xml=etree.fromstring(z.read("word/document.xml"))
    text="\n".join("".join(n.itertext()) for n in []) if False else "\n".join("".join(n.xpath(".//w:t/text()",namespaces=ns)) for n in xml.xpath("//w:p",namespaces=ns))
    (out/(p.stem+".txt")).write_text(text,encoding="utf-8")
    print("\n"+p.name+"\n"+text)

from pathlib import Path
import re,html,io,math
from PIL import Image as PILImage
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate,PageTemplate,Frame,Paragraph,Spacer,PageBreak,NextPageTemplate,Table,TableStyle,Image
from reportlab.lib.pagesizes import letter,landscape
ROOT=Path.cwd()
for name,file in [("Arial","arial.ttf"),("ArialBold","arialbd.ttf"),("ArialItalic","ariali.ttf")]:
    pdfmetrics.registerFont(TTFont(name,str(Path("C:/Windows/Fonts")/file)))
pdfmetrics.registerFontFamily("Arial",normal="Arial",bold="ArialBold",italic="ArialItalic",boldItalic="ArialBold")
styles={}
for name,font,size,leading in [("body","Arial",10.5,15),("h1","ArialBold",16,21),("h2","ArialBold",13,18),("small","Arial",8.5,12),("cell","Arial",9,12),("headcell","ArialBold",9,12),("title","ArialBold",28,35),("subtitle","Arial",15,22)]:
    styles[name]=ParagraphStyle(name,fontName=font,fontSize=size,leading=leading,spaceAfter=8,wordWrap="CJK")
for name in ["h1","h2"]:
    styles[name].keepWithNext=True;styles[name].spaceBefore=12;styles[name].textColor=colors.HexColor("#163E42")
styles["title"].spaceAfter=22;styles["title"].textColor=colors.HexColor("#163E42")
styles["schema"]=ParagraphStyle("schema",fontName="Arial",fontSize=9,leading=12.6,spaceAfter=5,wordWrap="CJK")
def inline(text):
    text=text.replace("\u2011","-").replace("\u2013","-").replace("\u2014","-");tokens=[]
    def link(m):
        label=html.escape(m.group(1));target=m.group(2)
        if target.startswith("https://"):value='<link href="'+html.escape(target,quote=True)+'" color="#205E67">'+label+'</link>'
        else:value=label+' <font size="8">('+html.escape(target)+')</font>'
        tokens.append(value);return "@@TOKEN"+str(len(tokens)-1)+"@@"
    text=re.sub(r"\[([^\]]+)\]\(([^)]+)\)",link,text)
    text=html.escape(text)
    text=re.sub(r"\*\*(.+?)\*\*",r"<b>\1</b>",text)
    text=re.sub(chr(96)+"([^"+chr(96)+"]+)"+chr(96),r'<font name="Arial">\1</font>',text)
    for i,t in enumerate(tokens):text=text.replace("@@TOKEN"+str(i)+"@@",t)
    return text
def para(text,style="body"):return Paragraph(inline(text),styles[style])
def make_table(rows,schema=False):
    cols=len(rows[0])
    if schema and cols==5:widths=[120,100,36,70,178]
    elif cols==3 and rows[0][0]=="ID":widths=[40,200,264]
    elif cols==3:widths=[140,182,182]
    elif cols==2:widths=[165,339]
    else:widths=[504/cols]*cols
    cells=[[para(v,"headcell" if r==0 else "cell") for v in row] for r,row in enumerate(rows)]
    table=Table(cells,colWidths=widths,repeatRows=1,hAlign="LEFT")
    pad=4 if schema else 6
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#E3EEEF")),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,colors.HexColor("#F5F7F8")]),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),pad),("BOTTOMPADDING",(0,0),(-1,-1),pad),("LINEBELOW",(0,0),(-1,0),.5,colors.HexColor("#8FAAAD")),("LINEBELOW",(0,1),(-1,-1),.25,colors.HexColor("#DDE5E7"))]))
    return table
class Document(BaseDocTemplate):
    def __init__(self,path,label):
        super().__init__(str(path),pagesize=letter,leftMargin=54,rightMargin=54,topMargin=54,bottomMargin=48,title="Campus Lost & Found Intelligent Matching System "+label,author="Campus Lost and Found project")
        self.label=label
        self.addPageTemplates([PageTemplate(id="portrait",pagesize=letter,frames=[Frame(54,48,504,690,id="portrait",leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=self.decorate),PageTemplate(id="landscape",pagesize=landscape(letter),frames=[Frame(54,48,684,510,id="landscape",leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=self.decorate)])
    def decorate(self,canvas,doc):
        width,height=canvas._pagesize
        canvas.setFont("Arial",8);canvas.setFillColor(colors.HexColor("#526267"))
        if doc.page>1:canvas.drawString(54,height-32,"Campus Lost & Found | "+self.label)
        canvas.drawString(54,28,"DBMS Level 3 | 2 October 2026");canvas.drawRightString(width-54,28,str(doc.page))
def cover(label,note):
    return [Spacer(1,55),para("Campus Lost & Found Intelligent Matching System","title"),para(label,"subtitle"),para("DBMS Experiential Learning Level 3 | 2 October 2026"),Spacer(1,16),make_table([["Member","SRN"],["Harshit Chandak","PES2UG24CS185"],["Hamza Shabir Sahapurwala","PES2UG24CS177"]]),Spacer(1,25),para(note),Spacer(1,15),para("[GitHub repository](https://github.com/Chandak06/DBMS-MINIPROJECT)"),para("Submission status: ready after genuine member Git contribution and course-specific manual confirmations.","small"),PageBreak()]
def markdown(lines,schema=False):
    story=[];i=0;tables_seen=0;new_group=True
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith("# "):i+=1;continue
        if line.startswith("### "):
            if schema and tables_seen and not new_group:story.append(PageBreak())
            story.append(para(line[4:],"h2"));tables_seen+=1;new_group=False;i+=1;continue
        if line.startswith("## "):
            if schema and story:story.append(PageBreak())
            story.append(para(line[3:],"h1"));new_group=True;i+=1;continue
        if line.startswith("|"):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith("|"):
                values=[v.strip() for v in lines[i].strip().strip("|").split("|")]
                if not all(re.match(r"^:?-+:?$",v) for v in values):rows.append(values)
                i+=1
            story.extend([make_table(rows,schema=schema),Spacer(1,11)]);continue
        if line.startswith("- "):story.append(para("• "+line[2:],"schema" if schema else "body"));i+=1;continue
        paragraph=[line];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r"^(#|\||- )",lines[i].strip()):paragraph.append(lines[i].strip());i+=1
        story.append(para(" ".join(paragraph),"schema" if schema else "body"))
    return story
def fit_image(pil,maxw,maxh):
    ratio=min(maxw/pil.width,maxh/pil.height);buf=io.BytesIO();pil.save(buf,format="PNG");buf.seek(0)
    return Image(buf,width=pil.width*ratio,height=pil.height*ratio)
def appendix_image(story,path,title,land=False):
    pil=PILImage.open(path).convert("RGB");maxw,maxh=(650,450) if land else (504,610)
    scale=min(maxw/pil.width,1);tile_h=int(maxh/scale);parts=math.ceil(pil.height/tile_h)
    cuts=[0];gray=pil.convert("L")
    for n in range(1,parts):
        target=round(pil.height*n/parts)
        low=max(cuts[-1]+1,pil.height-(parts-n)*tile_h,target-35)
        high=min(cuts[-1]+tile_h,target+35,pil.height-1)
        candidates=range(low,high+1)
        cut=min(candidates,key=lambda y:sum(pixel<170 for pixel in gray.crop((0,y,pil.width,y+1)).getdata())+abs(y-target)*.1)
        cuts.append(cut)
    cuts.append(pil.height)
    for n in range(parts):
        story.extend([NextPageTemplate("landscape" if land else "portrait"),PageBreak(),para(title+(" | excerpt "+str(n+1)+" of "+str(parts) if parts>1 else ""),"h1"),para("Actual browser evidence: "+path.name+". Continuous excerpts; original file included in docs/screenshots.","small")])
        crop=pil.crop((0,cuts[n],pil.width,cuts[n+1]));story.append(fit_image(crop,maxw,maxh))
def report():
    text=(ROOT/"docs/FINAL_REPORT.md").read_text(encoding="utf-8-sig")
    story=cover("Final project report","A connected recovery workflow using MySQL for relational decisions and MongoDB for flexible details and explainable matching. This report records delivered behavior, genuine verification and remaining human submission actions.")
    headings=re.findall(r"^## (.+)$",text,re.M);story.append(para("Report contents","h1"));guide=[];middle=(len(headings)+1)//2
    for n in range(middle):guide.append([para(headings[n],"small"),para(headings[n+middle],"small") if n+middle<len(headings) else ""])
    gt=Table(guide,colWidths=[252,252],hAlign="LEFT");gt.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),12)]))
    story.extend([gt,PageBreak()]);story.extend(markdown(text[text.index("## 1 Abstract"):].splitlines()))
    er=PILImage.open(ROOT/"docs/design/ER_Diagram.png").convert("RGB")
    story.extend([NextPageTemplate("landscape"),PageBreak(),para("Appendix A Original approved ER diagram","h1"),para("Unchanged conceptual design. Final implementation additions are listed in section 12 and the schema. The next pages enlarge overlapping areas of the same image.","small"),fit_image(er,684,430)])
    for label,box in zip(["upper left","upper right","lower left","lower right"],[(0,0,1120,880),(928,0,2048,880),(0,700,1120,1580),(928,700,2048,1580)]):
        story.extend([PageBreak(),para("ER detail "+label,"h1"),para("Magnified extract of the unchanged ER image. Overlap preserves relationship context.","small"),fit_image(er.crop(box),684,430)])
    for name,title,land in [("01-sign-in.jpg","Appendix B Role sign in",True),("04-match-evidence.jpg","Appendix C Matching explanation and review",True),("06-approved-claim.jpg","Appendix D Approved ownership claim",True),("14-found-report-form.jpg","Appendix E Found report form",False)]:appendix_image(story,ROOT/"docs/screenshots"/name,title,land)
    dest=ROOT/"docs/Campus_Lost_Found_Final_Report.pdf";Document(dest,"Final report").build(story);return dest
def schema():
    text=(ROOT/"docs/design/Relational_Schema.md").read_text(encoding="utf-8-sig")
    story=cover("Final relational schema","Canonical fresh-install schema from actual database metadata. Ten domain and two infrastructure tables are documented separately, including every column, key, CHECK, default, revision and generated uniqueness field. PK means primary key; FK means foreign key. A dash in Default means no non-NULL default is reported. Source SQL uses uppercase table names; Windows metadata uses equivalent lowercase names. Fresh identities are unsigned; compatibility retains original signed types. Dates persist as UTC and display in IST. The approved conceptual ER remains unchanged; implementation additions are documented here.")
    story.extend(markdown(text[text.index("## A Domain Tables"):].splitlines(),schema=True))
    dest=ROOT/"docs/design/Relational_Schema.pdf";Document(dest,"Final relational schema").build(story);return dest
if __name__=="__main__":
    for p in [report(),schema()]:print(str(p))

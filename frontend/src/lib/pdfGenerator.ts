import { jsPDF } from 'jspdf';
import { SlideDocument, SlideData } from '@/types/api';

export class PDFGenerator {
  private pdf: jsPDF;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
  }

  async generatePDF(slideDocument: SlideDocument): Promise<Buffer> {
    const slides = slideDocument.slides;
    
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) {
        this.pdf.addPage();
      }
      
      this.addSlideContent(slides[i], i + 1);
    }

    return Buffer.from(this.pdf.output('arraybuffer'));
  }

  private addSlideContent(slide: SlideData, pageNumber: number) {
    const pageWidth = this.pdf.internal.pageSize.getWidth();
    const pageHeight = this.pdf.internal.pageSize.getHeight();
    
    // スライドの背景色
    this.pdf.setFillColor(245, 245, 245);
    this.pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // タイトルの設定
    this.pdf.setFontSize(24);
    this.pdf.setTextColor(33, 37, 41);
    
    let yPosition = 30;
    
    // タイトルを追加
    const titleLines = this.pdf.splitTextToSize(slide.title, pageWidth - 40);
    this.pdf.text(titleLines, 20, yPosition);
    yPosition += titleLines.length * 10 + 20;
    
    // コンテンツの追加
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(52, 58, 64);
    
    if (slide.content) {
      const contentLines = this.pdf.splitTextToSize(slide.content, pageWidth - 40);
      this.pdf.text(contentLines, 20, yPosition);
    }
    
    // スライドタイプに応じた装飾
    this.addSlideDecoration(slide, pageWidth, pageHeight);
    
    // ページ番号
    this.pdf.setFontSize(12);
    this.pdf.setTextColor(108, 117, 125);
    this.pdf.text(`${pageNumber}`, pageWidth - 30, pageHeight - 10);
  }

  private addSlideDecoration(slide: SlideData, pageWidth: number, pageHeight: number) {
    switch (slide.type) {
      case 'title':
        // タイトルスライドの装飾
        this.pdf.setFillColor(59, 130, 246);
        this.pdf.rect(0, 0, pageWidth, 10, 'F');
        break;
      
      case 'content':
        // コンテンツスライドの装飾
        this.pdf.setFillColor(16, 185, 129);
        this.pdf.rect(0, 0, 10, pageHeight, 'F');
        break;
      
      case 'image':
        // 画像スライドの装飾（プレースホルダー）
        this.pdf.setFillColor(229, 231, 235);
        this.pdf.rect(20, pageHeight - 80, pageWidth - 40, 60, 'F');
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(107, 114, 128);
        this.pdf.text('画像プレースホルダー', pageWidth / 2, pageHeight - 45, { align: 'center' });
        break;
      
      case 'chart':
        // チャートスライドの装飾（プレースホルダー）
        this.pdf.setFillColor(254, 243, 199);
        this.pdf.rect(20, pageHeight - 80, pageWidth - 40, 60, 'F');
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(146, 64, 14);
        this.pdf.text('チャートプレースホルダー', pageWidth / 2, pageHeight - 45, { align: 'center' });
        break;
    }
  }

  async savePDF(buffer: Buffer, filename: string): Promise<string> {
    // MVP版では単純にメモリに保存
    // 実際の実装では S3 や Cloud Storage に保存
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    return `/uploads/${filename}`;
  }
}
import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqData = [
  {
    question: 'What types of documents can I analyze with Jack?',
    answer:
      'Jack supports a wide range of document formats including PDF, DOCX, TXT, JPG, and PNG files. Our platform is particularly optimized for construction documents such as plans, specifications, and quotes.',
  },
  {
    question: 'How does the document intelligence work?',
    answer:
      'Our platform uses advanced AWS Textract technology to extract text and structure from your documents. It then applies AI models via AWS SageMaker to understand the content, enabling you to ask questions and get relevant answers from your documents.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes, security is our priority. All documents are encrypted and stored in AWS S3 with strict access controls. We use industry-standard security practices and comply with relevant data protection regulations.',
  },
  {
    question: 'Can I organize documents into projects?',
    answer:
      'Absolutely. Jack allows you to create projects and organize related documents together, making it easier to manage complex construction jobs with multiple document sets.',
  },
  {
    question: 'How accurate is the information extraction?',
    answer:
      'Our document processing pipeline achieves high accuracy in extracting information from well-formatted documents. The system continuously improves through machine learning. For critical decisions, we recommend verifying AI-extracted information against the original documents.',
  },
  {
    question: 'Do you offer team collaboration features?',
    answer:
      'Yes, Jack supports team collaboration with shared projects, document access controls, and the ability to share insights across your organization.',
  },
]

export const FaqAccordion = () => {
  return (
    <div className="w-full">
      <Accordion type="single" collapsible className="w-full">
        {faqData.map((faq, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border-white/10"
          >
            <AccordionTrigger className="text-left font-medium text-white hover:text-emerald-300 transition-colors">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-gray-300 leading-relaxed">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

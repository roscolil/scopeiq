import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
// import { Project } from "@/types";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createSlug } from '@/utils/ui/navigation'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { AutocompleteInput } from '@/components/shared/AutocompleteInput'

const formSchema = z
  .object({
    address: z.string().optional(),
    streetNumber: z.string().optional(),
    streetName: z.string().optional(),
    suburb: z.string().optional(),
    postcode: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
  })
  .refine(
    data => {
      return (
        !!data.address ||
        (!!data.streetNumber &&
          !!data.streetName &&
          !!data.suburb &&
          !!data.postcode)
      )
    },
    {
      message: 'Please enter a valid address or fill out all address fields',
      path: ['address'],
    },
  )

type FormData = z.infer<typeof formSchema>

interface ProjectFormProps {
  onSubmit: (data: {
    address: string
    name: string
    description: string
    slug?: string
  }) => Promise<void>
  defaultValues?: {
    address: string
    streetNumber: string
    streetName: string
    suburb: string
    postcode: string
    name: string
    description: string
  }
}

export const ProjectForm = ({ onSubmit, defaultValues }: ProjectFormProps) => {
  const { toast } = useToast()
  const [showManualFields, setShowManualFields] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      address: '',
      streetNumber: '',
      streetName: '',
      suburb: '',
      postcode: '',
      name: '',
      description: '',
    },
  })

  const handleSubmit = async (data: FormData) => {
    if (isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)

      const formattedAddress =
        data.address ||
        `${data.streetNumber} ${data.streetName}, ${data.suburb} ${data.postcode}`

      await onSubmit({
        address: formattedAddress,
        name: data.name,
        description: data.description || '',
        slug: createSlug(data.name),
      })

      toast({
        title: 'Project saved',
        description: 'Your project has been saved successfully.',
      })

      // Reset form after successful submission
      form.reset()
    } catch (error) {
      // Extract the error message from the error object
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create project. Please try again.'

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!showManualFields ? (
          <>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Address</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => {
                setShowManualFields(true)
                form.setValue('address', '')
              }}
            >
              Can't find your address? Enter manually
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="streetNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="streetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Richmond" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postcode</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 3121" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => setShowManualFields(false)}
            >
              Use address search instead
            </Button>
          </>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter project description (optional)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Project...' : 'Save Project'}
        </Button>
      </form>
    </Form>
  )
}

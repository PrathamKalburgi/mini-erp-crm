import prisma from '../../lib/prisma';
import { CustomerStatus, CustomerType } from '../../constants/enums';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { buildPaginatedResponse, parsePaginationParams, PaginatedResponse } from '../../utils/pagination';
import {
  CreateCustomerInput,
  CustomerListQuerySchema,
  FollowUpNotesQuerySchema,
  UpdateCustomerInput,
} from './customer.dto';

export interface FormattedCustomer {
  id: number;
  customer_name: string;
  mobile_number: string;
  email: string;
  business_name: string;
  gst_number: string | null;
  customer_type: CustomerType;
  address: string;
  status: CustomerStatus;
  follow_up_date: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

function formatCustomer(customer: any): FormattedCustomer {
  const followUpDateStr = customer.follow_up_date instanceof Date
    ? customer.follow_up_date.toISOString().split('T')[0]
    : String(customer.follow_up_date).split('T')[0];

  return {
    ...customer,
    follow_up_date: followUpDateStr,
  };
}

export class CustomerService {
  public async getCustomers(rawQuery: Record<string, unknown>): Promise<PaginatedResponse<FormattedCustomer>> {
    const parseResult = CustomerListQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        code: 'INVALID_QUERY_PARAMETER',
        message: err.message,
      }));
      throw new BadRequestError('Unsupported query parameter', 'INVALID_QUERY_PARAMETER', details);
    }

    const { search, status, customer_type } = parseResult.data;

    if (status && !Object.values(CustomerStatus).includes(status)) {
      throw new BadRequestError(`Invalid status value '${status}'`, 'INVALID_QUERY_PARAMETER', [
        { field: 'status', code: 'INVALID_QUERY_PARAMETER', message: `Invalid status value '${status}'` },
      ]);
    }

    if (customer_type && !Object.values(CustomerType).includes(customer_type)) {
      throw new BadRequestError(`Invalid customer_type value '${customer_type}'`, 'INVALID_QUERY_PARAMETER', [
        { field: 'customer_type', code: 'INVALID_QUERY_PARAMETER', message: `Invalid customer_type value '${customer_type}'` },
      ]);
    }

    const paginationParams = parsePaginationParams(rawQuery);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customer_type) {
      where.customer_type = customer_type;
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { mobile_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { business_name: { contains: search, mode: 'insensitive' } },
        { gst_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: { id: 'asc' },
      }),
    ]);

    const formattedCustomers = customers.map(formatCustomer);
    return buildPaginatedResponse(formattedCustomers, totalItems, paginationParams);
  }

  public async createCustomer(data: CreateCustomerInput): Promise<FormattedCustomer> {
    const customer = await prisma.customer.create({
      data: {
        customer_name: data.customer_name,
        mobile_number: data.mobile_number,
        email: data.email,
        business_name: data.business_name,
        gst_number: data.gst_number,
        customer_type: data.customer_type,
        address: data.address,
        status: data.status,
        follow_up_date: new Date(`${data.follow_up_date}T00:00:00.000Z`),
        notes: data.notes ?? '',
      },
    });

    return formatCustomer(customer);
  }

  public async getCustomerById(id: number): Promise<FormattedCustomer> {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`, 'CUSTOMER_NOT_FOUND');
    }

    return formatCustomer(customer);
  }

  public async updateCustomer(id: number, data: UpdateCustomerInput): Promise<FormattedCustomer> {
    await this.getCustomerById(id);

    const updatePayload: any = {};
    if (data.customer_name !== undefined) updatePayload.customer_name = data.customer_name;
    if (data.mobile_number !== undefined) updatePayload.mobile_number = data.mobile_number;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.business_name !== undefined) updatePayload.business_name = data.business_name;
    if (data.gst_number !== undefined) updatePayload.gst_number = data.gst_number;
    if (data.customer_type !== undefined) updatePayload.customer_type = data.customer_type;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.follow_up_date !== undefined) {
      updatePayload.follow_up_date = new Date(`${data.follow_up_date}T00:00:00.000Z`);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updatePayload,
    });

    return formatCustomer(updated);
  }

  public async addFollowUpNote(customerId: number, noteText: string, createdByUserId: number) {
    await this.getCustomerById(customerId);

    const createdNote = await prisma.customerFollowUpNote.create({
      data: {
        customer_id: customerId,
        note: noteText,
        created_by_user_id: createdByUserId,
      },
    });

    return createdNote;
  }

  public async getFollowUpNotes(customerId: number, rawQuery: Record<string, unknown>) {
    await this.getCustomerById(customerId);

    const parseResult = FollowUpNotesQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        code: 'INVALID_QUERY_PARAMETER',
        message: err.message,
      }));
      throw new BadRequestError('Unsupported query parameter', 'INVALID_QUERY_PARAMETER', details);
    }

    const paginationParams = parsePaginationParams(rawQuery);
    const where = { customer_id: customerId };

    const [totalItems, notes] = await prisma.$transaction([
      prisma.customerFollowUpNote.count({ where }),
      prisma.customerFollowUpNote.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: { id: 'desc' },
      }),
    ]);

    return buildPaginatedResponse(notes, totalItems, paginationParams);
  }
}

export const customerService = new CustomerService();

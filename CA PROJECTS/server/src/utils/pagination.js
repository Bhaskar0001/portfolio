/**
 * Build pagination query params from request
 */
const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const sort = query.sort || '-createdAt';

    return { page, limit, skip, sort };
};

/**
 * Build paginated response
 */
const paginatedResponse = (data, total, { page, limit }) => ({
    data,
    pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
    },
});

module.exports = { parsePagination, paginatedResponse };

import { useEffect, useState } from 'react';
import { message, Modal, Dropdown } from 'antd';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '../../redux/hooks';
import {
    callFetchComments,
    callCreateComment,
    callUpdateComment,
    callDeleteComment,
    callFetchReplies,
} from '../../api/api';
import { formatDateFull } from '../../utils/dateUtils';
import { CharCount } from '../../utils/charCountUtils';

const MAX_COMMENT_LENGTH = 500;
const MAX_PREVIEW_LENGTH = 100;

const DefaultAvatar = ({ name, className = 'w-9 h-9' }) => (
    <div
        className={`${className} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold shrink-0`}
    >
        {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
);

const CommentItem = ({
    comment,
    isReply = false,
    rootId,
    onEdit,
    onDelete,
    onReply,
    onLoadMoreReplies,
    isAuthenticated,
    loadingMoreReplies = false,
}) => {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isEditing, setIsEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const isOwner = comment.owner ?? comment.isOwner ?? false;
    const edited = comment.edited ?? comment.isEdited ?? false;

    const repliesData = comment.replies;
    const repliesList = Array.isArray(repliesData?.result) ? repliesData.result : [];
    const repliesMeta = repliesData?.meta;
    const totalReplies = comment.totalReplies ?? repliesMeta?.total ?? 0;
    const canLoadMoreReplies = repliesMeta && repliesMeta.page + 1 < repliesMeta.pages;

    const handleSubmitReply = async () => {
        if (!replyContent.trim()) return;
        setSubmittingReply(true);
        try {
            await onReply(rootId ?? comment.id, replyContent.trim());
            setReplyContent('');
            setShowReplyInput(false);
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleEdit = async () => {
        setDropdownOpen(false);
        if (editContent.trim() === comment.content) {
            setIsEditing(false);
            return;
        }
        try {
            await onEdit(comment.id, editContent.trim());
            setIsEditing(false);
            setIsExpanded(false);
        } catch {
            // error handled in parent
        }
    };

    const handleDelete = () => {
        setDropdownOpen(false);
        Modal.confirm({
            title: 'Xóa bình luận',
            content: 'Bạn có chắc muốn xóa bình luận này?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                setDeleting(true);
                try {
                    await onDelete(comment.id);
                } finally {
                    setDeleting(false);
                }
            },
        });
    };

    const dropdownItems = [
        { key: 'edit', label: 'Chỉnh sửa', onClick: () => { setIsEditing(true); setEditContent(comment.content); } },
        { key: 'delete', label: 'Xóa', danger: true, onClick: handleDelete },
    ];

    return (
        <div className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : ''}`}>
            {comment.userAvatar ? (
                <img
                    src={comment.userAvatar}
                    alt={comment.userFullName}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                />
            ) : (
                <DefaultAvatar name={comment.userFullName} />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <span className="font-medium text-gray-900">{comment.userFullName}</span>
                        <span className="text-gray-500 text-sm ml-2">
                            {comment.createdAt ? formatDateFull(comment.createdAt) : ''}
                            {edited && <span className="ml-1">(đã chỉnh sửa)</span>}
                        </span>
                    </div>
                    {isOwner && (
                        <Dropdown
                            menu={{ items: dropdownItems }}
                            trigger={['click']}
                            open={dropdownOpen}
                            onOpenChange={setDropdownOpen}
                        >
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </button>
                        </Dropdown>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            maxLength={MAX_COMMENT_LENGTH}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                        <CharCount value={editContent} max={MAX_COMMENT_LENGTH} />
                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={!editContent.trim() || editContent.trim() === comment.content}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Lưu
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setEditContent(comment.content); }}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : (() => {
                    const content = comment.content ?? '';
                    const shouldTruncate = content.length > MAX_PREVIEW_LENGTH;
                    const displayContent =
                        shouldTruncate && !isExpanded
                            ? `${content.slice(0, MAX_PREVIEW_LENGTH)}...`
                            : content;
                    return (
                        <div className="mt-1">
                            <p className="text-gray-700 whitespace-pre-wrap break-words">{displayContent}</p>
                            {shouldTruncate && (
                                <button
                                    type="button"
                                    onClick={() => setIsExpanded((v) => !v)}
                                    className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                </button>
                            )}
                        </div>
                    );
                })()}

                {isAuthenticated && !isEditing && (
                    <button
                        type="button"
                        onClick={() => setShowReplyInput(!showReplyInput)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showReplyInput ? 'Hủy' : 'Trả lời'}
                    </button>
                )}

                {showReplyInput && isAuthenticated && (
                    <div className="mt-3">
                        <div className="flex gap-2">
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                maxLength={MAX_COMMENT_LENGTH}
                                placeholder="Viết trả lời..."
                                rows={2}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                onClick={handleSubmitReply}
                                disabled={!replyContent.trim() || submittingReply}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 self-end"
                            >
                                {submittingReply ? 'Đang gửi...' : 'Gửi'}
                            </button>
                        </div>
                        <CharCount value={replyContent} max={MAX_COMMENT_LENGTH} />
                    </div>
                )}

                {/* Replies (cấp 2) */}
                {repliesList.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {repliesList.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                isReply
                                rootId={comment.id}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onReply={onReply}
                                isAuthenticated={isAuthenticated}
                            />
                        ))}
                        {canLoadMoreReplies && (
                            <button
                                type="button"
                                onClick={() => onLoadMoreReplies(comment.id)}
                                disabled={loadingMoreReplies}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                            >
                                {loadingMoreReplies ? 'Đang tải...' : `Xem thêm trả lời`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const TestCommentSection = ({ testId, isAuthenticated }) => {
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState([]);
    const [meta, setMeta] = useState(null);
    const [newCommentContent, setNewCommentContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadingMoreReplies, setLoadingMoreReplies] = useState({});

    const canLoadMore = meta && meta.page + 1 < meta.pages;

    const fetchComments = async (page = 0, append = false) => {
        const setter = append ? setLoadingMore : setLoading;
        setter(true);
        try {
            const res = await callFetchComments(testId, page, 10);
            const data = res?.data ?? res;
            const list = Array.isArray(data?.result) ? data.result : [];
            const m = data?.meta ?? {};

            if (append) {
                setComments((prev) => [...prev, ...list]);
            } else {
                setComments(list);
            }
            setMeta(m);
        } catch (err) {
            message.error(err?.message || 'Không thể tải bình luận');
        } finally {
            setter(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated || !testId) return;
        fetchComments(0);
    }, [testId, isAuthenticated]);

    const handleCreateComment = async () => {
        if (!newCommentContent.trim()) return;
        setSubmitting(true);
        const scrollY = window.scrollY;
        const lastPage = meta?.page ?? 0;
        try {
            await callCreateComment({ content: newCommentContent.trim(), testId });
            setNewCommentContent('');
            await fetchComments(0);
            for (let p = 1; p <= lastPage; p++) {
                await fetchComments(p, true);
            }
            requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)));
        } catch (err) {
            message.error(err?.message || 'Không thể đăng bình luận');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateComment = async (commentId, content) => {
        try {
            await callUpdateComment(commentId, { content });
            setComments((prev) =>
                prev.map((c) => {
                    if (c.id === commentId) return { ...c, content, edited: true };
                    if (c.replies?.result) {
                        return {
                            ...c,
                            replies: {
                                ...c.replies,
                                result: c.replies.result.map((r) =>
                                    r.id === commentId ? { ...r, content, edited: true } : r
                                ),
                            },
                        };
                    }
                    return c;
                })
            );
        } catch (err) {
            message.error(err?.message || 'Không thể cập nhật');
            throw err;
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            await callDeleteComment(commentId);
            setComments((prev) => {
                const filtered = prev.filter((c) => c.id !== commentId);
                if (filtered.length === prev.length) {
                    return prev.map((c) => {
                        if (!c.replies?.result) return c;
                        const newReplies = c.replies.result.filter((r) => r.id !== commentId);
                        if (newReplies.length === c.replies.result.length) return c;
                        return { ...c, replies: { ...c.replies, result: newReplies }, totalReplies: Math.max(0, (c.totalReplies ?? 0) - 1) };
                    });
                }
                return filtered;
            });
        } catch (err) {
            message.error(err?.message || 'Không thể xóa');
        }
    };

    const handleReply = async (parentId, content) => {
        const scrollY = window.scrollY;
        const lastPage = meta?.page ?? 0;
        try {
            await callCreateComment({ content, testId, parentId });
            await fetchComments(0);
            for (let p = 1; p <= lastPage; p++) {
                await fetchComments(p, true);
            }
            requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)));
        } catch (err) {
            message.error(err?.message || 'Không thể gửi trả lời');
        }
    };

    const handleLoadMoreReplies = async (commentId) => {
        const comment = comments.find((c) => c.id === commentId);
        if (!comment?.replies?.meta) return;
        const nextPage = (comment.replies.meta.page ?? 0) + 1;
        setLoadingMoreReplies((prev) => ({ ...prev, [commentId]: true }));
        try {
            const res = await callFetchReplies(commentId, nextPage, 5);
            const data = res?.data ?? res;
            const newReplies = Array.isArray(data?.result) ? data.result : [];
            const newMeta = data?.meta ?? {};

            setComments((prev) =>
                prev.map((c) => {
                    if (c.id !== commentId) return c;
                    const existing = c.replies?.result ?? [];
                    return {
                        ...c,
                        replies: {
                            meta: newMeta,
                            result: [...existing, ...newReplies],
                        },
                    };
                })
            );
        } catch (err) {
            message.error(err?.message || 'Không thể tải thêm trả lời');
        } finally {
            setLoadingMoreReplies((prev) => ({ ...prev, [commentId]: false }));
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Bình luận</h2>
                <p className="text-gray-500">Đăng nhập để xem và tham gia bình luận.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bình luận</h2>

            <div className="mb-4">
                <textarea
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    maxLength={MAX_COMMENT_LENGTH}
                    placeholder="Viết bình luận..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <CharCount value={newCommentContent} max={MAX_COMMENT_LENGTH} />
                <button
                    onClick={handleCreateComment}
                    disabled={!newCommentContent.trim() || submitting}
                    className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? 'Đang đăng...' : 'Đăng bình luận'}
                </button>
            </div>

            {loading ? (
                <div className="py-8 text-center text-gray-500">Đang tải bình luận...</div>
            ) : comments.length === 0 ? (
                <div className="py-8 text-center text-gray-500">Chưa có bình luận. Hãy là người đầu tiên!</div>
            ) : (
                <div className="space-y-4">
                    {comments.map((c) => (
                        <CommentItem
                            key={c.id}
                            comment={c}
                            onEdit={handleUpdateComment}
                            onDelete={handleDeleteComment}
                            onReply={handleReply}
                            onLoadMoreReplies={handleLoadMoreReplies}
                            isAuthenticated={isAuthenticated}
                            loadingMoreReplies={loadingMoreReplies[c.id]}
                        />
                    ))}
                    {canLoadMore && (
                        <div className="pt-2 flex justify-center">
                            <button
                                type="button"
                                onClick={() => fetchComments((meta?.page ?? 0) + 1, true)}
                                disabled={loadingMore}
                                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                            >
                                {loadingMore ? 'Đang tải...' : 'Xem thêm bình luận'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TestCommentSection;

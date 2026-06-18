import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Switch, Button, message, Card, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  GlobalOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { callCreateFlashcard } from "../../api/api";
import AudioPlayerUI from "../../components/client/modal/AudioPlayerUI";
import DictionaryDefinitionDropdown from "../../components/client/flashcard/DictionaryDefinitionDropdown";
import useFlashcardDictionaryLookup from "../../hooks/useFlashcardDictionaryLookup";

const { TextArea } = Input;

const FlashcardCreatePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [items, setItems] = useState([
    { vocabulary: "", definition: "", pronunciation: "", audioUrl: "" },
  ]);

  // --- STATE VALIDATION ---
  const [errors, setErrors] = useState({
    name: "",
    items: [{ vocabulary: "", definition: "" }],
  });

  const {
    lookupSuggestions,
    lookupLoadingByIndex,
    scheduleLookup,
    flushLookup,
    applySuggestion,
    cleanupLookupForIndex,
  } = useFlashcardDictionaryLookup(items, setItems);

  // --- CÁC HÀM XỬ LÝ FORM ---
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);

    // Clear error
    if (errors.items[index] && errors.items[index][field]) {
      const newErrors = { ...errors };
      newErrors.items[index] = { ...newErrors.items[index], [field]: "" };
      setErrors(newErrors);
    }

    // Auto lookup when user pauses typing (only for vocabulary field)
    if (field === "vocabulary") {
      scheduleLookup(index, value);
    }
  };

  const handleNameChange = (value) => {
    setName(value);
    if (errors.name) {
      setErrors({ ...errors, name: "" });
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { vocabulary: "", definition: "", pronunciation: "", audioUrl: "" },
    ]);
    setErrors({
      ...errors,
      items: [...errors.items, { vocabulary: "", definition: "" }],
    });
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      return;
    }
    cleanupLookupForIndex(index);
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);

    const newErrors = { ...errors };
    newErrors.items = newErrors.items.filter((_, i) => i !== index);
    setErrors(newErrors);
  };

  const handleSubmit = async () => {
    // 1. Validate
    const newErrors = {
      name: "",
      items: items.map(() => ({ vocabulary: "", definition: "" })),
    };
    let hasError = false;

    if (!name.trim()) {
      newErrors.name = "Flashcard name must not be blank.";
      hasError = true;
    } else if (!/^[\p{L}0-9 ().,'-]{1,100}$/u.test(name.trim())) {
      newErrors.name =
        "Flashcard name can only contain letters, digits, spaces, and special characters ().,'- and must be between 1 and 100 characters long.";
      hasError = true;
    }

    items.forEach((item, index) => {
      if (!item.vocabulary.trim()) {
        newErrors.items[index].vocabulary =
          "Flashcard item vocabulary must not be blank.";
        hasError = true;
      }
      if (!item.definition.trim()) {
        newErrors.items[index].definition =
          "Flashcard item definition must not be blank.";
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      // Scroll to first error
      if (newErrors.name) {
        document
          .querySelector('input[placeholder*="topic vocabulary"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const firstErrorIndex = items.findIndex(
          (item, idx) =>
            newErrors.items[idx].vocabulary || newErrors.items[idx].definition,
        );
        if (firstErrorIndex !== -1) {
          const errorElement =
            document.querySelectorAll(".flashcard-item")[firstErrorIndex];
          errorElement?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
      return;
    }

    // 2. Prepare Payload
    const payload = {
      name: name.trim(),
      description: description.trim(),
      accessType: isPublic ? "PUBLIC" : "PRIVATE",
      items: items.map((item) => ({
        vocabulary: item.vocabulary.trim(),
        definition: item.definition.trim(),
        pronunciation: (item.pronunciation || "").trim(),
        audioUrl: (item.audioUrl || "").trim(),
      })),
    };

    // 3. Call API
    setIsSubmitting(true);
    try {
      const res = await callCreateFlashcard(payload);
      if (res && res.status >= 200 && res.status < 300) {
        message.success("Flashcard set created successfully!");
        navigate("/flashcards", { state: { activeTab: "my" } });
      }
    } catch (error) {
      console.error(error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      message.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* --- HEADER CỐ ĐỊNH (Sticky Header) --- */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              navigate("/flashcards", { state: { activeTab: "my" } })
            }
            className="border-none shadow-none hover:bg-gray-100"
          />
          <h1 className="text-xl font-bold text-gray-800 m-0">
            Create new flashcard set
          </h1>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={isSubmitting}
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-lg font-semibold"
        >
          Finish
        </Button>
      </div>

      {/* --- BODY --- */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* 1. THÔNG TIN CHUNG */}
        <Card className="shadow-sm rounded-xl border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  size="large"
                  placeholder="E.g. Business topic vocabulary..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`font-semibold ${errors.name ? "border-red-500" : ""}`}
                  status={errors.name ? "error" : ""}
                />
                {errors.name && (
                  <div className="text-red-500 text-sm mt-1">{errors.name}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <TextArea
                  rows={3}
                  placeholder="Add a description to help learners understand this set..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-1 bg-blue-50 p-4 rounded-lg flex flex-col justify-center items-center gap-3 border border-blue-100">
              <span className="font-medium text-gray-700">Visibility</span>
              <Switch
                checkedChildren={<GlobalOutlined />}
                unCheckedChildren={<LockOutlined />}
                checked={isPublic}
                onChange={setIsPublic}
                className="scale-125"
              />
              <span
                className={`text-sm font-bold ${isPublic ? "text-blue-600" : "text-gray-500"}`}
              >
                {isPublic ? "Public" : "Private"}
              </span>
              <p className="text-xs text-center text-gray-500 mt-2">
                {isPublic
                  ? "Everyone can find and study this flashcard set."
                  : "Only you can see this flashcard set."}
              </p>
            </div>
          </div>
        </Card>

        {/* 2. DANH SÁCH TỪ VỰNG */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">
            Vocabulary list ({items.length})
          </h2>

          {items.map((item, index) => (
            <div
              key={index}
              className="flashcard-item bg-white rounded-xl shadow-sm border p-4 relative group hover:border-blue-300 transition-all border-gray-200"
              style={{
                borderColor:
                  errors.items[index]?.vocabulary ||
                  errors.items[index]?.definition
                    ? "#ef4444"
                    : undefined,
              }}
            >
              {/* Số thứ tự */}
              <div className="absolute -left-3 top-4 w-8 h-8 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center font-bold text-gray-500 text-sm z-10">
                {index + 1}
              </div>

              {/* Nút xóa */}
              <Tooltip title="Delete this card">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveItem(index)}
                  className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity"
                />
              </Tooltip>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                {/* Cột Từ vựng */}
                <div className="space-y-3">
                  <div
                    className={`relative border-b-2 transition-colors pb-1 ${
                      errors.items[index]?.vocabulary
                        ? "border-red-500"
                        : "border-transparent focus-within:border-blue-500"
                    }`}
                  >
                    <label className="text-xs text-gray-400 uppercase font-semibold">
                      Term <span className="text-red-500">*</span>
                    </label>
                    <Input
                      variant="borderless"
                      placeholder="Enter vocabulary..."
                      className="text-lg font-bold text-blue-900 px-0 py-1"
                      value={item.vocabulary}
                      onChange={(e) =>
                        handleItemChange(index, "vocabulary", e.target.value)
                      }
                      onBlur={(e) => flushLookup(index, e.target.value)}
                    />
                    <DictionaryDefinitionDropdown
                      visible={Boolean(
                        lookupSuggestions[index]?.options?.length,
                      )}
                      loading={Boolean(lookupLoadingByIndex[index])}
                      word={lookupSuggestions[index]?.word}
                      options={lookupSuggestions[index]?.options}
                      onSelect={(option) => applySuggestion(index, option)}
                    />
                    {errors.items[index]?.vocabulary && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.items[index].vocabulary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cột Định nghĩa */}
                <div className="space-y-3">
                  <div
                    className={`border-b-2 transition-colors pb-1 ${
                      errors.items[index]?.definition
                        ? "border-red-500"
                        : "border-transparent focus-within:border-blue-500"
                    }`}
                  >
                    <label className="text-xs text-gray-400 uppercase font-semibold">
                      Definition <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                      variant="borderless"
                      placeholder="Enter definition..."
                      className="text-lg text-gray-800 px-0 py-1"
                      value={item.definition}
                      onChange={(e) =>
                        handleItemChange(index, "definition", e.target.value)
                      }
                      autoSize={{ minRows: 1, maxRows: 8 }}
                    />
                    {errors.items[index]?.definition && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors.items[index].definition}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nếu có audioUrl thì hiển thị player xem trước */}
                {item.audioUrl && (
                  <div className="md:col-span-2 mt-2 max-w-md">
                    <AudioPlayerUI audioUrl={item.audioUrl} playButtonOnly />
                  </div>
                )}

                {/* Pronunciation (display-only, only if exists) */}
                {item.pronunciation && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase font-semibold">
                      Pronunciation
                    </label>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm text-gray-700 bg-gray-50 border border-gray-200 w-fit">
                      /{item.pronunciation}/
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Nút Thêm Thẻ - UI Lớn */}
          <button
            onClick={handleAddItem}
            className="w-full py-6 bg-white border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-semibold group"
          >
            <PlusOutlined className="text-2xl mb-2 group-hover:scale-110 transition-transform" />
            <span>Add new card</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCreatePage;

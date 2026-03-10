'use client';

import { FormQuestion } from '../../lib/types';
import { DeleteIcon } from '../../lib/icons';

interface QuestionEditorProps {
  questions: FormQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<FormQuestion[]>>;
}

export default function QuestionEditor({ questions, setQuestions }: QuestionEditorProps) {
  const addQuestion = (type: 'text' | 'textarea' | 'radio') => {
    setQuestions([...questions, {
      question_text: '',
      question_type: type,
      options: type === 'radio' ? [{ option_text: '' }] : undefined,
    }]);
  };

  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].question_text = text;
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options?.push({ option_text: '' });
    } else {
      newQuestions[questionIndex].options = [{ option_text: '' }];
    }
    setQuestions(newQuestions);
  };

  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options![optionIndex].option_text = text;
    }
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options?.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  return (
    <>
      <h2 className="text-xl font-bold mb-3">Service Fields:</h2>
      <div className="space-y-6 mb-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-gray-700 p-4 rounded-lg border border-gray-600 relative">
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              className="absolute top-2 right-2 text-red-400 hover:text-red-600"
              title="Remove Field"
            >
              <DeleteIcon/>
            </button>
            {/* Move buttons */}
            <div className="absolute top-2 right-10 flex space-x-1">
              <button
                type="button"
                onClick={() => moveQuestion(qIndex, 'up')}
                disabled={qIndex === 0}
                className="text-gray-400 hover:text-gray-200 disabled:opacity-30"
                title="Move Up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(qIndex, 'down')}
                disabled={qIndex === questions.length - 1}
                className="text-gray-400 hover:text-gray-200 disabled:opacity-30"
                title="Move Down"
              >
                ▼
              </button>
            </div>
            <label htmlFor={`question-${qIndex}`} className="block text-gray-300 font-bold mb-2">Field Label:</label>
            <input
              type="text"
              id={`question-${qIndex}`}
              value={q.question_text}
              onChange={(e) => updateQuestionText(qIndex, e.target.value)}
              className="border p-2 w-full rounded-md mb-2 text-gray-300"
              placeholder={`Enter field label for ${q.question_type}...`}
              required
            />
            <span className="text-sm text-gray-400">Type: {q.question_type.charAt(0).toUpperCase() + q.question_type.slice(1)}</span>

            {q.question_type === 'radio' && (
              <div className="mt-4">
                <h3 className="text-md font-semibold text-gray-300 mb-2">Options:</h3>
                <div className="space-y-2">
                  {q.options?.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option.option_text}
                        onChange={(e) => updateOptionText(qIndex, oIndex, e.target.value)}
                        className="border p-1 flex-grow rounded-md text-gray-300"
                        placeholder={`Option ${oIndex + 1}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        className="text-red-400 hover:text-red-600 text-sm"
                        title="Remove Option"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="mt-3 bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                >
                  + Add Option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex space-x-2 mb-6">
        <button
          type="button"
          onClick={() => addQuestion('text')}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Add Short Text Field
        </button>
        <button
          type="button"
          onClick={() => addQuestion('textarea')}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Add Paragraph Field
        </button>
        <button
          type="button"
          onClick={() => addQuestion('radio')}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
        >
          Add Radio Field
        </button>
      </div>
    </>
  );
}

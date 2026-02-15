import React from 'react';

const QuestionBlock = ({ question, selectedValue, onAnswer }) => {
  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {question.text} {question.required && <span className="text-red-500">*</span>}
      </h3>
      <div className="space-y-3">
        {question.alternatives?.map((alt) => (
          <label 
            key={alt.id} 
            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
              selectedValue === alt.score_value 
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={alt.score_value}
              checked={selectedValue === alt.score_value}
              onChange={() => onAnswer(question.id, alt.score_value)}
              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <span className="ml-3 text-sm font-medium">{alt.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default QuestionBlock;